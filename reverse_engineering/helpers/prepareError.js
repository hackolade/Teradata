const prepareError = error => ({
	message: error.message,
	stack: error.stack,
	type: error.type,
	customMsgCode: error.customMsgCode,
});

module.exports = {
	prepareError,
};
