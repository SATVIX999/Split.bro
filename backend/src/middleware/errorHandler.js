const AppError = require('../utils/AppError');

const notFoundHandler = (req, res, next) => {
    next(new AppError(`Endpoint not found on this server: ${req.method} ${req.originalUrl}`, 404));
};

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode || 500;
    error.status = err.status || 'error';

    if (err.name === 'CastError') {
        const message = `Resource not found with invalid ID format: ${err.value}`;
        error = new AppError(message, 400);
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        const value = err.keyValue ? err.keyValue[field] : '';
        const message = `Duplicate value '${value}' entered for ${field}. Please use another value.`;
        error = new AppError(message, 409);
    }

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(el => el.message);
        const message = `Validation error: ${errors.join('. ')}`;
        error = new AppError(message, 400, errors);
    }

    if (err.name === 'JsonWebTokenError') {
        error = new AppError('Invalid authentication token.', 401);
    }

    if (err.name === 'TokenExpiredError') {
        error = new AppError('Authentication token has expired. Please log in again.', 401);
    }

    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            error = new AppError('Uploaded file exceeds the maximum allowed size (5 MB)', 400);
        } else {
            error = new AppError(`File upload error: ${err.message}`, 400);
        }
    }

    if (!error.isOperational) {
        console.error('[UNEXPECTED SERVER ERROR]', err);
    }

    const responsePayload = {
        status: error.status,
        message: error.message || 'An unexpected server error occurred'
    };

    if (error.errors) {
        responsePayload.errors = error.errors;
    }

    // Include stack trace only in development
    if (process.env.NODE_ENV === 'development' && !error.isOperational) {
        responsePayload.stack = err.stack;
    }

    res.status(error.statusCode).json(responsePayload);
};

module.exports = {
    notFoundHandler,
    errorHandler
};
