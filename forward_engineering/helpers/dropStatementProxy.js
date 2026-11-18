const dropStatementProxy =
	({ commentIfNotCommented }) =>
	(applyDropStatements, ddlProvider) => {
		let hasDropStatements = false;

		return {
			...ddlProvider,
			...['dropSchema', 'dropTable', 'dropColumn', 'dropIndex', 'dropCheckConstraint', 'dropView'].reduce(
				(result, method) => {
					return {
						...result,
						[method]: (...params) => {
							const script = ddlProvider[method](...params);
							hasDropStatements = hasDropStatements || Boolean(script);

							if (applyDropStatements) {
								return script;
							}

							return commentIfNotCommented(script, { isActivated: false });
						},
					};
				},
				{},
			),
			isDropInStatements() {
				return hasDropStatements;
			},
		};
	};

module.exports = dropStatementProxy;
