function errorMiddleware(error, req, res, next) {
    console.log(error)
    let { status = 500, message, data } = error;

    console.log(`[Error] ${error}`);
    console.log(status,'<--')
    // If status code is 500 - change the message to Internal server error
    message = status === 500 || !message ? 'Internal server error' : message;

    res.status(status).send(message);
}

module.exports = errorMiddleware;