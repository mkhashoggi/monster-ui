define(function(require) {
	var $ = require('jquery'),
		_ = require('underscore'),
		monster = require('monster'),
		toastr = require('toastr');

	var portWizard = {

		// Defines API requests not included in the SDK
		requests: {
		},

		// Define the events available for other apps
		subscribe: {
			'common.portWizard.render': 'portWizardRenderPortInfo'
		},

		appFlags: {
			attachments: {
				mimeTypes: [
					'application/pdf'
				],
				maxSize: 8
			}
		},

		portWizardRenderPortInfo: function(args) {
			var self = this,
				container = args.container,
				appendTemplate = function appendTemplate() {
					var template = $(self.getTemplate({
						name: 'portInfo',
						data: {
							request: args.data.request
						},
						submodule: 'portWizard'
					}));

					if (args.data.request.hasOwnProperty('uploads') && args.data.request.uploads.hasOwnProperty('bill.pdf')) {
						var billUploadTemplate = $(self.getTemplate({
								name: 'portInfo-billUpload',
								submodule: 'portWizard'
							})),
							actionsTemplate = $(self.getTemplate({
								name: 'portInfo-actions',
								submodule: 'portWizard'
							}));

						billUploadTemplate
							.find('#bill_input')
								.fileUpload({
									btnClass: 'monster-button-primary monster-button-small',
									btnText: self.i18n.active().portRequestWizard.fileUpload.button,
									inputOnly: true,
									inputPlaceholder: self.i18n.active().portRequestWizard.fileUpload.placeholder,
									mimeTypes: self.appFlags.attachments.mimeTypes,
									maxSize: self.appFlags.attachments.maxSize,
									filesList: [ 'bill.pdf' ],
									success: function(results) {
										args.data.attachments.bill = results[0];
									},
									error: function(errorsList) {
										self.portWizardFileUploadErrorsHandler(errorsList);
									}
								});

						template
							.find('.bill-upload-wrapper')
								.append(billUploadTemplate);

						template
							.find('.actions')
								.append(actionsTemplate);

						template
							.find('.bill-upload')
								.show();
					}

					container
						.empty()
						.append(template);

					container
						.find('#name')
							.focus();

					self.portWizardBindPortInfoEvents(args);
				};

			$.extend(true, args, {
				data: {
					attachments: {},
					request: {
						numbers: {}
					}
				}
			});

			appendTemplate();
		},

		portWizardBindPortInfoEvents: function(args) {
			var self = this,
				container = args.container,
				billFileData;

			container
				.find('.numbers-type')
					.on('change', function(event) {
						event.preventDefault();

						var template;

						if (container.find('.bill-upload-wrapper').is(':empty')) {
							template = $(self.getTemplate({
								name: 'portInfo-billUpload',
								submodule: 'portWizard'
							})).css('display', 'none');

							template
								.find('#bill_input')
									.fileUpload({
										btnClass: 'monster-button-primary monster-button-small',
										btnText: self.i18n.active().portRequestWizard.fileUpload.button,
										inputOnly: true,
										inputPlaceholder: self.i18n.active().portRequestWizard.fileUpload.placeholder,
										mimeTypes: self.appFlags.attachments.mimeTypes,
										maxSize: self.appFlags.attachments.maxSize,
										success: function(results) {
											var actionsTemplate = $(self.getTemplate({
												name: 'portInfo-actions',
												submodule: 'portWizard'
											})).css('display', 'none');

											if (container.find('.portInfo-success').length < 1) {
												billFileData = results[0];

												container
													.find('.actions')
														.prepend(actionsTemplate);

												container
													.find('.portInfo-success')
														.fadeIn();
											}
										},
										error: function(errorsList) {
											self.portWizardFileUploadErrorsHandler(errorsList);
										}
									});

							container
								.find('.bill-upload-wrapper')
									.append(template);

							container
								.find('.bill-upload')
									.fadeIn();
						}
					});

			container
				.on('click', '.portInfo-success', function(event) {
					event.preventDefault();

					var $form = container.find('#form_port_info'),
						formData = monster.ui.getFormData('form_port_info');

					monster.ui.validate($form, {
						rules: {
							name: {
								required: true,
								minlength: 1,
								maxlength: 128
							},
							'type': {
								required: true
							}
						}
					});

					if (monster.ui.valid($form)) {
						$.extend(true, args.data, {
							request: formData,
							attachments: {
								bill: billFileData
							}
						});

						self.portWizardRenderAccountVerification(args);
					}
				});

			container
				.find('.cancel')
					.on('click', function(event) {
						event.preventDefault();

						self.portWizardHelperCancelPort(args);
					});
		},

		portWizardRenderAccountVerification: function(args) {
			var self = this,
				container = args.container,
				appendTemplate = function appendTemplate(billFileData) {
					var template = $(self.getTemplate({
						name: 'accountVerification',
						data: {
							request: args.data.request
						},
						submodule: 'portWizard'
					}));

					monster.ui.renderPDF(billFileData, template.find('.pdf-container'));

					container
						.empty()
						.append(template);

					self.portWizardBindAccountVerificationEvents(args);
				};

			if (args.data.request.hasOwnProperty('uploads') && args.data.request.uploads.hasOwnProperty('bill.pdf')) {
				self.portWizardRequestGetAttahcment({
					data: {
						portRequestId: args.data.request.id,
						documentName: 'bill.pdf'
					},
					success: function(billFileData) {
						args.data.attachments.bill = {
							file: billFileData
						};

						appendTemplate(billFileData);
					}
				});
			} else {
				appendTemplate(args.data.attachments.bill.file);
			}
		},

		portWizardBindAccountVerificationEvents: function(args) {
			var self = this,
				container = args.container;

			container
				.find('.next')
					.on('click', function(event) {
						event.preventDefault();

						var action = $(this).data('action'),
							$form = container.find('#form_account_verification'),
							formData = monster.ui.getFormData('form_account_verification');

						monster.ui.validate($form, {
							rules: {
								'bill.name': {
									minlength: 1,
									maxlength: 128
								},
								'bill.street_address': {
									minlength: 1,
									maxlength: 128
								},
								'bill.locality': {
									minlength: 1,
									maxlength: 128
								},
								'bill.region': {
									minlength: 2,
									maxlength: 2
								},
								'bill.postal_code': {
									digits: true,
									minlength: 5,
									maxlength: 5
								},
								'bill.account_number': {
									maxlength: 128
								},
								'bill.pin': {
									maxlength: 6
								},
								'bill.btn': {
									maxlength: 20
								},
								validation: {
									required: true
								}
							}
						});

						if (monster.ui.valid($form)) {
							$.extend(true, args.data.request, {
								bill: formData.bill
							});

							if (action === 'save') {
								self.portWizardHelperSavePort($.extend(true, args, {
									success: args.globalCallback
								}));
							} else if (action === 'next') {
								self.portWizardRenderAddNumbers(args);
							}
						}
					});

			container
				.find('.cancel')
					.on('click', function(event) {
						event.preventDefault();

						self.portWizardHelperCancelPort(args);
					});
		},

		portWizardRenderAddNumbers: function(args) {
			var self = this,
				container = args.container,
				template = $(self.getTemplate({
					name: 'addNumbers',
					submodule: 'portWizard'
				}));

			monster.ui.renderPDF(args.data.attachments.bill.file, template.find('.pdf-container'));

			container
				.empty()
				.append(template);

			self.portWizardRenderAddNumbersList(args);

			self.portWizardBindAddNumbersEvents(args);
		},

		portWizardBindAddNumbersEvents: function(args) {
			var self = this,
				container = args.container;

			container
				.find('.collapse')
					.on('click', function(event) {
						event.preventDefault();

						var $this = $(this);

						$this
							.fadeOut(function() {
								container
									.find('.accordion')
										.slideDown();
							});
					});

			container
				.find('.add-numbers')
					.on('click', function(event) {
						event.preventDefault();

						var $form = container.find('#form_add_numbers'),
							formData = monster.ui.getFormData('form_add_numbers'),
							newNumbers = {},
							phoneNumber;

						monster.ui.validate($form, {
							rules: {
								numbers: {
									required: true
								}
							}
						});

						if (monster.ui.valid($form)) {
							formData.numbers = formData.numbers.replace(/[\n]/g, ' ');
							formData.numbers = formData.numbers.replace(/[-().]/g, '').split(' ');

							_.each(formData.numbers, function(number) {
								phoneNumber = number.match(/^\+(.*)$/);

								if (phoneNumber && phoneNumber[1]) {
									newNumbers[number] = {};
								}
							});

							$.extend(true, args, {
								data: {
									request: {
										numbers: newNumbers
									}
								}
							});

							container
								.find('.accordion')
									.slideUp(function() {
										$form
											.find('textarea')
												.val('');

										container
											.find('.collapse')
												.fadeIn();
									});

							self.portWizardRenderAddNumbersList(args);

							if (args.data.request.numbers.hasOwnProperty(args.data.request.bill.btn)) {
								self.portWizardRenderAddNumbersPortion(args);
							}
						}
					});

			container
				.find('.next')
					.on('click', function(event) {
						event.preventDefault();

						var sign = $(this).data('sign');

						if (sign === 'manual') {
							self.portWizardRenderUploadForm(args);
						} else {
							self.portWizardRenderSignForm(args);
						}
					});

			container
				.find('.cancel')
					.on('click', function(event) {
						event.preventDefault();

						self.portWizardHelperCancelPort(args);
					});
		},

		portWizardRenderAddNumbersList: function(args) {
			var self = this,
				container = args.container,
				dataToTemplate = $.extend(true, args.data, {
					request: {
						extra: {
							numbers_count: _.keys(args.data.request.numbers).length
						}
					}
				}),
				template = $(self.getTemplate({
					name: 'addNumbers-list',
					data: dataToTemplate,
					submodule: 'portWizard'
				}));

			container
				.find('.list-wrapper')
					.fadeOut(function() {
						$(this)
							.empty()
							.append(template)
							.slideDown();
					});

			self.portWizardBindAddNumbersListEvents(args);
		},

		portWizardUpdateAddNumbersList: function(args) {
			var self = this,
				container = args.container,
				dataToTemplate = $.extend(true, args.data, {
					request: {
						extra: {
							numbers_count: _.keys(args.data.request.numbers).length
						}
					}
				}),
				template = $(self.getTemplate({
					name: 'addNumbers-list',
					data: dataToTemplate,
					submodule: 'portWizard'
				}));

			container
				.find('.list-wrapper')
					.empty()
					.append(template);
		},

		portWizardBindAddNumbersListEvents: function(args) {
			var self = this,
				container = args.container;

			container
				.on('click', '.remove-number', function(event) {
					event.preventDefault();

					var $this = $(this),
						$item = $this.parents('.item'),
						number = $item.data('number');

					if (args.data.request.bill.btn === number) {
						container
							.find('.portion-wrapper')
								.slideUp(function() {
									$(this)
										.empty();
								});

						container
							.find('.btn-wrapper')
								.slideUp(function() {
									$(this)
										.emty();
								});
					}

					delete args.data.request.numbers[number];

					self.portWizardUpdateAddNumbersList(args);
				});
		},

		portWizardRenderAddNumbersPortion: function(args) {
			var self = this,
				container = args.container,
				template = $(self.getTemplate({
					name: 'addNumbers-portion',
					submodule: 'portWizard'
				}));

			container
				.find('.portion-wrapper')
					.fadeOut(function() {
						$(this)
							.empty()
							.append(template)
							.fadeIn();

						self.portWizardBindAddNumbersPortionEvents(args);
					});
		},

		portWizardBindAddNumbersPortionEvents: function(args) {
			var self = this,
				container = args.container;

			container
				.find('.portion-item')
					.on('click', function(event) {
						event.preventDefault();

						var $this = $(this),
							portion = $this.data('portion');

						if (!$this.hasClass('active')) {
							$this
								.siblings()
									.removeClass('active');

							$this
								.addClass('active');

							if (portion === 'full') {
								container
									.find('.btn-wrapper')
										.slideUp(function() {
											$(this)
												.empty();
										});
							}
						}
					});
		},

		portWizardRenderUploadForm: function(args) {
			var self = this,
				container = args.container,
				formType = self.portWizardGetFormType(args.data.request),
				dataToTemplate = {
					type: self.i18n.active().portRequestWizard.formTypes[formType],
					link: monster.config.whitelabel.port[formType]
				},
				template = $(self.getTemplate({
					name: 'uploadForm',
					data: dataToTemplate,
					submodule: 'portWizard'
				})),
				fileUploadoptions = {
					btnClass: 'monster-button-primary monster-button-small',
					btnText: self.i18n.active().portRequestWizard.fileUpload.button,
					inputOnly: true,
					inputPlaceholder: self.i18n.active().portRequestWizard.fileUpload.placeholder,
					mimeTypes: self.appFlags.attachments.mimeTypes,
					maxSize: self.appFlags.attachments.maxSize,
					success: function(results) {
						$.extend(true, args.data, {
							attachments: {
								form: results[0]
							}
						});

						if (template.find('.uploadForm-success').length < 1) {
							actionsTemplate = $(self.getTemplate({
								name: 'uploadForm-actions',
								submodule: 'portWizard'
							})).css('display', 'none');

							template
								.find('.actions')
									.append(actionsTemplate);

							template
								.find('.uploadForm-success')
									.fadeIn();
						}
					},
					error: function(errorsList) {
						self.portWizardFileUploadErrorsHandler(errorsList);
					}
				},
				actionsTemplate;

			if (args.data.request.hasOwnProperty('uploads') && args.data.request.uploads.hasOwnProperty('form.pdf')) {
				fileUploadoptions.filesList = [ 'form.pdf' ];

				actionsTemplate = $(self.getTemplate({
					name: 'uploadForm-actions',
					submodule: 'portWizard'
				}));

				template
					.find('.actions')
						.append(actionsTemplate);
			}

			template
				.find('#form_input')
					.fileUpload(fileUploadoptions);

			container
				.empty()
				.append(template);

			self.portWizardBindUploadFormEvents(args);
		},

		portWizardBindUploadFormEvents: function(args) {
			var self = this,
				container = args.container;

			container
				.find('.save')
					.on('click', function(event) {
						event.preventDefault();

						self.portWizardHelperSavePort($.extend(true, args, {
							success: args.globalCallback
						}));
					});

			container
				.on('click', '.uploadForm-success', function(event) {
					event.preventDefault();

					self.portWizardRenderPortNotify(args);
				});

			container
				.find('.cancel')
					.on('click', function(event) {
						event.preventDefault();

						console.log(args.data.request);
					});
		},

		portWizardRenderSignForm: function(args) {
			var self = this,
				container = args.container,
				formType = self.portWizardGetFormType(args.data.request),
				dataToTemplate = {
					type: self.i18n.active().portRequestWizard.formTypes[formType]
				},
				template = $(self.getTemplate({
					name: 'signForm',
					data: dataToTemplate,
					submodule: 'portWizard'
				}));

			container
				.empty()
				.append(template);

			self.portWizardBindSignFormEvents(args);
		},

		portWizardBindSignFormEvents: function(args) {
			var self = this,
				container = args.container;

			container
				.find('.success')
					.on('click', function(event) {
						event.preventDefault();

						self.portWizardRenderPortNotify(args);
					});

			container
				.find('.cancel')
					.on('click', function(event) {
						event.preventDefault();

						self.portWizardHelperCancelPort(args);
					});
		},

		portWizardRenderPortNotify: function(args) {
			var self = this,
				container = args.container,
				template = $(self.getTemplate({
					name: 'portNotify',
					data: {
						request: args.data.request
					},
					submodule: 'portWizard'
				}));

			container
				.empty()
				.append(template);

			container
				.find('#email')
					.focus();

			self.portWizardBindPortNotifyEvents(args);
		},

		portWizardBindPortNotifyEvents: function(args) {
			var self = this,
				container = args.container,
				minDate = monster.util.getBusinessDate(4),
				defaultDate = args.data.request.hasOwnProperty('transfer_date') ? monster.util.gregorianToDate(args.data.request.transfer_date) : minDate;

			monster.ui.datepicker(container.find('#transfer_date'), {
				minDate: minDate,
				beforeShowDay: $.datepicker.noWeekends
			}).datepicker('setDate', defaultDate);

			container
				.find('.next')
					.on('click', function(event) {
						event.preventDefault();

						var action = $(this).data('action'),
							formData = monster.ui.getFormData('form_notify');

						$.extend(true, args.data.request, formData, {
							transfer_date: monster.util.dateToGregorian(new Date(formData.transfer_date))
						});

						if (action === 'save') {
							self.portWizardHelperSavePort($.extend(true, args, {
								success: args.globalCallback
							}));
						} else if (action === 'next') {
							self.portWizardRenderSubmitPort(args);
						}
					});

			container
				.find('.cancel')
					.on('click', function(event) {
						event.preventDefault();

						self.portWizardHelperCancelPort(args);
					});
		},

		portWizardRenderSubmitPort: function(args) {
			var self = this,
				container = args.container,
				dataToTemplate = {
					request: args.data.request,
					today: new Date()
				},
				template = $(self.getTemplate({
					name: 'portSubmit',
					data: dataToTemplate,
					submodule: 'portWizard'
				}));

			container
				.empty()
				.append(template);

			self.portWizardBindPortSubmitEvents(args);
		},

		portWizardBindPortSubmitEvents: function(args) {
			var self = this,
				container = args.container;

			container
				.find('.conditions')
					.on('change', function(event) {
						event.preventDefault();

						var formData = monster.ui.getFormData('form_conditions'),
							disabled = formData.conditions.indexOf(false) > -1;

						container
							.find('.success')
								.prop('disabled', disabled);
					});

			container
				.find('.success')
					.on('click', function(event) {
						event.preventDefault();

						self.portWizardHelperSavePort($.extend(true, args, {
							success: function(requestId) {
								self.portWizardRequestUpdateState({
									data: {
										requestId: requestId,
										state: 'submitted'
									}
								});
							}
						}));
					});

			container
				.find('.cancel')
					.on('click', function(event) {
						event.preventDefault();

						self.portWizardHelperCancelPort(args);
					});
		},

		/**************************************************
		 *              Data handling helpers             *
		 **************************************************/

		portWizardGetFormType: function(portData) {
			return portData.type === 'local' ? 'loa' : 'resporg';
		},

		portWizardFileUploadErrorsHandler: function(errorsList) {
			var self = this,
				mimeTypes = self.appFlags.attachments.mimeTypes,
				maxSize = self.appFlags.attachments.maxSize,
				fileTypes;

			_.each(errorsList, function(files, type) {
				_.each(files, function(file) {
					if (type === 'mimeTypes') {
						fileTypes = mimeTypes.map(function(value) { return (/[^/]*$/.exec(value)[0]).toUpperCase(); }).join(', ');

						toastr.warning(file + self.i18n.active().portRequestWizard.toastr.warning.mimeTypes.replace('{{variable}}', fileTypes));
					} else if (type === 'size') {
						toastr.warning(file + self.i18n.active().portRequestWizard.toastr.warning.size.replace('{{variable}}', maxSize));
					}
				});
			});
		},

		portWizardHelperSavePort: function(args) {
			var self = this;

			if (args.data.request.hasOwnProperty('id')) {
				self.portWizardHelperUpdatePort(args);
			} else {
				self.portWizardHelperCreatePort(args);
			}
		},

		portWizardHelperCreatePort: function(args) {
			var self = this,
				attachments = _.extend({}, args.data.attachments);

			delete args.data.request.extra;

			self.portWizardRequestCreatePort({
				data: {
					data: args.data.request
				},
				success: function(port) {
					if (!_.isEmpty(attachments)) {
						_.each(attachments, function(attachment, key, object) {
							object[key] = function(callback) {
								self.portWizardRequestCreateAttachment({
									data: {
										portRequestId: port.id,
										documentName: key + '.pdf',
										data: attachment.file
									},
									success: function() {
										callback(null);
									}
								});
							};
						});

						monster.series(attachments, function(err, results) {
							if (err) {
								args.hasOwnProperty('error') && args.error();
							} else {
								args.hasOwnProperty('success') && args.success(port.id);
							}
						});
					} else {
						args.hasOwnProperty('success') && args.success(port.id);
					}
				},
				error: function() {
					args.hasOwnProperty('error') && args.error();
				}
			});
		},

		portWizardHelperUpdatePort: function(args) {
			var self = this,
				attachments = _.extend({}, args.data.attachments);

			_.each(attachments, function(attachment, key, object) {
				if (!attachment.hasOwnProperty('name')) {
					delete object[key];
				}
			});

			delete args.data.request.extra;

			self.portWizardRequestUpdatePort({
				data: {
					data: args.data.request
				},
				success: function(port) {
					if (!_.isEmpty(attachments)) {
						_.each(attachments, function(attachment, key, object) {
							if (args.data.request.uploads.hasOwnProperty(key + '.pdf')) {
								object[key] = function(callback) {
									self.portWizardRequestUpdateAttachment({
										data: {
											portRequestId: port.id,
											documentName: key + '.pdf',
											data: attachment.file
										},
										success: function() {
											callback(null);
										}
									});
								};
							} else {
								object[key] = function(callback) {
									self.portWizardRequestCreateAttachment({
										data: {
											portRequestId: port.id,
											documentName: key + '.pdf',
											data: attachment.file
										},
										success: function() {
											callback(null);
										}
									});
								};
							}
						});

						monster.series(attachments, function(err, results) {
							if (err) {
								args.hasOwnProperty('error') && args.error();
							} else {
								args.hasOwnProperty('success') && args.success(port.id);
							}
						});
					} else {
						args.hasOwnProperty('success') && args.success(port.id);
					}
				},
				error: function() {
					args.hasOwnProperty('error') && args.error();
				}
			});
		},

		portWizardHelperCancelPort: function(args) {
			var self = this;

			if (args.data.request.hasOwnProperty('id')) {
				self.portWizardRequestDeletePort({
					data: {
						portRequestId: args.data.request.id
					},
					success: function() {
						args.globalCallback();
					}
				});
			} else {
				args.globalCallback();
			}
		},

		/**************************************************
		 *              Requests declarations             *
		 **************************************************/

		// Port requests endpoints
		portWizardRequestCreatePort: function(args) {
			var self = this;

			self.callApi({
				resource: 'port.create',
				data: $.extend(true, {
					accountId: self.accountId
				}, args.data),
				success: function(data, status) {
					args.hasOwnProperty('success') && args.success(data.data);
				},
				error: function(parsedError, error, globalHandler) {
					args.hasOwnProperty('error') && args.error(parsedError);
				}
			});
		},
		portWizardRequestUpdatePort: function(args) {
			var self = this;

			self.callApi({
				resource: 'port.update',
				data: $.extend(true, {
					accountId: self.accountId
				}, args.data),
				success: function(data, status) {
					args.hasOwnProperty('success') && args.success(data.data);
				},
				error: function(parsedError, error, globalHandler) {
					args.hasOwnProperty('error') && args.error(parsedError);
				}
			});
		},
		portWizardRequestDeletePort: function(args) {
			var self = this;

			self.callApi({
				resource: 'port.delete',
				data: $.extend(true, {
					accountId: self.accountId
				}, args.data),
				success: function(data, status) {
					args.hasOwnProperty('success') && args.success(data.data);
				},
				error: function(parsedError, error, globalHandler) {
					args.hasOwnProperty('error') && args.error(parsedError);
				}
			});
		},
		portWizardRequestUpdateState: function(args) {
			var self = this;

			self.callApi({
				resource: 'port.changeState',
				data: $.extend(true, {
					accountId: self.accountId
				}, args.data),
				success: function(data, status) {
					args.hasOwnProperty('success') && args.success(data.data);
				},
				error: function(parsedError, error, globalHandler) {
					args.hasOwnProperty('error') && args.error(parsedError);
				}
			});
		},

		// Attachments endpoints
		portWizardRequestCreateAttachment: function(args) {
			var self = this;

			self.callApi({
				resource: 'port.createAttachment',
				data: $.extend(true, {
					accountId: self.accountId
				}, args.data),
				success: function(data, status) {
					args.hasOwnProperty('success') && args.success(data.data);
				},
				error: function(parsedError, error, globalHandler) {
					args.hasOwnProperty('error') && args.error(parsedError);
				}
			});
		},
		portWizardRequestGetAttahcment: function(args) {
			var self = this;

			self.callApi({
				resource: 'port.getAttachment',
				data: $.extend(true, {
					accountId: self.accountId
				}, args.data),
				success: function(data, status) {
					// `data` is a string representation of the PDF in base 64
					args.hasOwnProperty('success') && args.success(data);
				},
				error: function(parsedError, error, globalHandler) {
					args.hasOwnProperty('error') && args.error(parsedError);
				}
			});
		},
		portWizardRequestUpdateAttachment: function(args) {
			var self = this;

			self.callApi({
				resource: 'port.updateAttachment',
				data: $.extend(true, {
					accountId: self.accountId
				}, args.data),
				success: function(data, status) {
					args.hasOwnProperty('success') && args.success(data.data);
				},
				error: function(parsedError, error, globalHandler) {
					args.hasOwnProperty('error') && args.error(parsedError);
				}
			});
		}
	};

	return portWizard;
});
