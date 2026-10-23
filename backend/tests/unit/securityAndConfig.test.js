const fs = require('fs');
const path = require('path');
const os = require('os');
const { validateConfig } = require('../../src/config/config');
const { validateMagicBytes, verifyReceiptContent } = require('../../src/middleware/upload');

describe('Unit Tests: JWT/Env Configuration & File Signature Validation', () => {
    describe('Production Environment & JWT Configuration (validateConfig)', () => {
        test('should reject default development JWT_SECRET in production mode', () => {
            expect(() => {
                validateConfig('production', {
                    JWT_SECRET: 'splitbro_super_secure_jwt_secret_dev_key_2026',
                    MONGO_URI: 'mongodb://127.0.0.1:27017/splitbro_prod'
                });
            }).toThrow(/\[Security Exception\] In production, JWT_SECRET must be explicitly set/i);
        });

        test('should reject short (< 32 chars) JWT_SECRET in production mode', () => {
            expect(() => {
                validateConfig('production', {
                    JWT_SECRET: 'too-short-secret-12345',
                    MONGO_URI: 'mongodb://127.0.0.1:27017/splitbro_prod'
                });
            }).toThrow(/\[Security Exception\] In production, JWT_SECRET must be at least 32 characters long/i);
        });

        test('should reject missing MONGO_URI in production mode', () => {
            expect(() => {
                validateConfig('production', {
                    JWT_SECRET: 'a-very-strong-production-jwt-secret-key-at-least-32-chars'
                });
            }).toThrow(/\[Configuration Exception\] In production, MONGO_URI must be explicitly set/i);
        });

        test('should pass in production mode with strong 32+ char JWT_SECRET and explicit MONGO_URI', () => {
            expect(() => {
                validateConfig('production', {
                    JWT_SECRET: 'a-very-strong-production-jwt-secret-key-at-least-32-chars',
                    MONGO_URI: 'mongodb://127.0.0.1:27017/splitbro_prod'
                });
            }).not.toThrow();
        });
    });

    describe('Binary Magic-Byte File Signature Validation (validateMagicBytes & verifyReceiptContent)', () => {
        let tempDir;

        beforeAll(() => {
            tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'splitbro-magic-test-'));
        });

        afterAll(() => {
            fs.rmSync(tempDir, { recursive: true, force: true });
        });

        test('should validate genuine PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)', () => {
            const filePath = path.join(tempDir, 'valid.png');
            fs.writeFileSync(filePath, Buffer.from('89504E470D0A1A0A0000000D49484452', 'hex'));
            expect(validateMagicBytes(filePath)).toBe('image/png');
        });

        test('should validate genuine JPEG magic bytes (FF D8 FF)', () => {
            const filePath = path.join(tempDir, 'valid.jpg');
            fs.writeFileSync(filePath, Buffer.from('FFD8FFE000104A4649460001', 'hex'));
            expect(validateMagicBytes(filePath)).toBe('image/jpeg');
        });

        test('should validate genuine PDF magic bytes (%PDF / 25 50 44 46)', () => {
            const filePath = path.join(tempDir, 'valid.pdf');
            fs.writeFileSync(filePath, Buffer.from('%PDF-1.7\n1 0 obj\n', 'utf-8'));
            expect(validateMagicBytes(filePath)).toBe('application/pdf');
        });

        test('should validate genuine WEBP RIFF+WEBP header', () => {
            const filePath = path.join(tempDir, 'valid.webp');
            const buf = Buffer.concat([
                Buffer.from('52494646', 'hex'),
                Buffer.from('24000000', 'hex'),
                Buffer.from('57454250', 'hex')
            ]);
            fs.writeFileSync(filePath, buf);
            expect(validateMagicBytes(filePath)).toBe('image/webp');
        });

        test('should reject spoofed executable/script disguised as image/png', () => {
            const filePath = path.join(tempDir, 'spoofed.png');
            fs.writeFileSync(filePath, Buffer.from('#!/bin/sh\nrm -rf /', 'utf-8'));
            expect(validateMagicBytes(filePath)).toBeNull();
        });

        test('verifyReceiptContent middleware should reject extension/signature mismatch and unlink file', () => {
            const filePath = path.join(tempDir, 'mismatch.pdf');
            // Write PNG bytes into a .pdf file
            fs.writeFileSync(filePath, Buffer.from('89504E470D0A1A0A0000000D49484452', 'hex'));
            const req = {
                file: {
                    path: filePath,
                    originalname: 'mismatch.pdf'
                }
            };
            let capturedError = null;
            verifyReceiptContent(req, {}, (err) => {
                capturedError = err;
            });
            expect(capturedError).toBeDefined();
            expect(capturedError.statusCode).toBe(400);
            expect(capturedError.message).toMatch(/extension does not match the actual binary content signature/i);
            expect(fs.existsSync(filePath)).toBe(false);
        });
    });
});
