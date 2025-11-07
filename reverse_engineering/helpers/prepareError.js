const { ERROR_MESSAGE } = require('../../constants/constants');

const prepareError = error => {
	if (error.message === ERROR_MESSAGE.aborted) {
		return null;
	}

	return {
		message: error.message,
		stack: error.stack,
		type: error.type,
		customMsgCode: error.customMsgCode,
	};
};

module.exports = {
	prepareError,
};
