const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const config = require('../config/config');
const AppError = require('../utils/AppError');

if (!fs.existsSync(config.receiptsDir)) {
    fs.mkdirSync(config.receiptsDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.receiptsDir);
    },
    filename: (req, file, cb) => {
        const rawExt = path.extname(file.originalname).toLowerCase();
        const safeExt = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : '.jpg';
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        cb(null, `receipt-${uniqueSuffix}${safeExt}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(
            new AppError(
                'Invalid file format. Only JPEG, PNG, WEBP images and PDF documents are allowed for receipts.',
                400
            ),
            false
        );
    }

    cb(null, true);
};

const uploadReceipt = multer({
    storage: storage,
    limits: {
        fileSize: config.maxFileSize
    },
    fileFilter: fileFilter
});

const validateMagicBytes = (filePathOrBuffer) => {
    let buffer;
    let bytesRead;

    if (Buffer.isBuffer(filePathOrBuffer)) {
        buffer = filePathOrBuffer;
        bytesRead = buffer.length;
    } else {
        if (typeof filePathOrBuffer !== 'string' || !fs.existsSync(filePathOrBuffer)) return null;
        let fd;
        try {
            fd = fs.openSync(filePathOrBuffer, 'r');
            buffer = Buffer.alloc(16);
            bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
        } finally {
            if (fd !== undefined) {
                try { fs.closeSync(fd); } catch (e) {}
            }
        }
    }

    if (!bytesRead || bytesRead < 4) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytesRead >= 8 &&
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
        buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
        return 'image/png';
    }

    // PDF: 25 50 44 46 (%PDF)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
        return 'application/pdf';
    }

    // WEBP: RIFF .... WEBP
    if (bytesRead >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP') {
        return 'image/webp';
    }

    return null;
};

const verifyReceiptContent = (req, res, next) => {
    if (!req.file) return next();

    const detectedType = validateMagicBytes(req.file.path);
    if (!detectedType) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return next(new AppError('Uploaded file content does not match any valid image or PDF format (corrupted or spoofed file detected).', 400));
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const isJpegMatch = (ext === '.jpg' || ext === '.jpeg') && detectedType === 'image/jpeg';
    const isPngMatch = ext === '.png' && detectedType === 'image/png';
    const isPdfMatch = ext === '.pdf' && detectedType === 'application/pdf';
    const isWebpMatch = ext === '.webp' && detectedType === 'image/webp';

    if (!isJpegMatch && !isPngMatch && !isPdfMatch && !isWebpMatch) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return next(new AppError('Uploaded file extension does not match the actual binary content signature.', 400));
    }

    next();
};

module.exports = {
    uploadReceipt,
    validateMagicBytes,
    verifyReceiptContent,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS
};
