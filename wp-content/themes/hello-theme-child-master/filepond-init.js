jQuery(document).ready(function($) {
	const photosInput = document.querySelector('#photos');
	if (!photosInput) {
		return;
	}
	// First register any plugins
	$.fn.filepond.registerPlugin(FilePondPluginImagePreview);
	$.fn.filepond.registerPlugin(FilePondPluginFileValidateSize);
	$.fn.filepond.registerPlugin(FilePondPluginFileValidateType);
	$.fn.filepond.registerPlugin(FilePondPluginImageExifOrientation);
	$.fn.filepond.registerPlugin(FilePondPluginFileRename);
	// Turn input element into a pond
	$('#photos').filepond();

	var photosIds = [];

	var photosHiddenValue = $('#photos_hidden').val().trim();
	var galleryUrls = [];
	var galleryObjects = [];
	var transformedgalleryUrlsArray = [];
	if (photosHiddenValue !== '') {
		var photosArray = photosHiddenValue.split(',');
		var fetchPromises = [];

		photosArray.forEach(function(ID) {
			var fetchPromise = new Promise(function(resolve) {
				wp.media.attachment(ID).fetch().then(function(data) {

					var url = wp.media.attachment(ID).get('url');

					galleryUrls.push(url);
					var galleryObject = {
						url: url,
						id: ID
					};

					galleryObjects.push(galleryObject);
					resolve();
				});
			});

			fetchPromises.push(fetchPromise);
		});

		// Wait for all fetch operations to complete
		Promise.all(fetchPromises).then(function() {

			$.each(galleryUrls, function(index, url) {


				transformedgalleryUrlsArray.push({
					source: url,
					options: {
						type: 'local',
					},
				});
			});

			$('#photos').filepond({
				allowMultiple: true,
				// 		storeAsFile: true,
				required: true,
				maxFileSize: '500KB',
				acceptedFileTypes: ['image/png', 'image/jpeg'],
				maxParallelUploads: 1,
				checkValidity: true,
				maxFiles: 100,
				forceRevert: true,
				imagePreviewHeight: 250,	
				server: {
					process:(fieldName, file, metadata, load, error, progress, abort, transfer, options) => {

						// fieldName is the name of the input field
						// file is the actual file object to send
						const formData = new FormData();
						formData.append('action', 'upload_image');
						formData.append('security', RestVars.nonce);
						formData.append(fieldName, file, file.name);


						jQuery.ajax( {
							url: RestVars.ajaxurl,
							method: 'POST',
							processData: false,
							contentType: false,
							beforeSend: function ( xhr ) {
								xhr.setRequestHeader( 'X-WP-Nonce', RestVars.nonce );
							},
							data:formData
						} ).success( function ( response ) {
							// get a reference to the root node
							const pond = document.querySelector('.filepond--root');
							photosIds.push(response);
							photosIds = photosIds.filter(Boolean);
							$('#photos_hidden').val(photosIds.join(',')).trigger('change')

							load(response);			

							pond.addEventListener('FilePond:processfile', (e) => {

								var fileId = e.detail.file.id;
								var fileName = e.detail.file.filename;

								// Check if the element already contains .featured_image
								var fileItem = $('#filepond--item-'+fileId);
								fileItem.attr( 'data-attachment-id', response);
								if (!fileItem.find('.featured_image').length) {
									// If it doesn't contain .featured_image, append it
									fileItem.append('<span class="featured_image"></span>');
								}

							});

						} ).error( function( response ) {
							console.log( 'error' );
							console.log( response );
							error(response); // not sure if that contains the response message
						});
						// Should expose an abort method so the request can be canceled
						// 				return {
						// 					abort: () => {
						// 						// User tapped cancel, abort our ongoing actions here

						// 						// Let FilePond know the request has been canceled
						// 						xhr.abort();
						// 						abort();

						// 					},
						// 				};
					}, // process end
					load: (source, load, error, progress, abort, headers) => {
						// Should request a file object from the server here
						const xhr = new XMLHttpRequest();
						xhr.responseType = 'blob';

						xhr.onload = function () {
							if (xhr.status === 200) {
								const blob = xhr.response;

								// Can call the header method to supply FilePond with early response header string
								// https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/getAllResponseHeaders
								headers(xhr.getAllResponseHeaders());

								// Should call the progress method to update the progress to 100% before calling load
								// (endlessMode, loadedSize, totalSize)
								progress(true, blob.size, blob.size);

								// Should call the load method with a file object or blob when done
								load(blob);
							} else {
								error('Failed to fetch image');
							}
						};

						xhr.onerror = function () {
							error('Failed to fetch image');
						};

						xhr.open('GET', source);
						xhr.send();

						// Should expose an abort method so the request can be canceled
						return {
							abort: () => {
								// User tapped cancel, abort our ongoing actions here

								// Let FilePond know the request has been canceled
								xhr.abort();
								abort();
							},
						};
					},

				},
				files: transformedgalleryUrlsArray,
			});
			const pond = document.querySelector('.filepond--root');

			pond.addEventListener('FilePond:addfile', (e) => {
				var fileSource = e.detail.file.source;
				var foundId = null;

				for (var i = 0; i < galleryObjects.length; i++) {
					if (galleryObjects[i].url === fileSource) {
						foundId = galleryObjects[i].id;
						break;
					}
				}

	

				photosIds.push(foundId);
				var fileId = e.detail.file.id;
				var fileItem = $('#filepond--item-'+fileId);
				// Check if the element already contains .featured_image
				var fileItem = $('#filepond--item-'+fileId);
				fileItem.attr( 'data-attachment-id', foundId);
				if (!fileItem.find('.featured_image').length) {
					// If it doesn't contain .featured_image, append it
					fileItem.append('<span class="featured_image">Main Image</span>');
				}
				var featuredImageVal = $('#featured_image').val();
				if(fileItem.attr( 'data-attachment-id') === featuredImageVal) {
					$('#filepond--item-'+fileId).find('.featured_image').addClass('active');
				} 
				// 				photosIds = photosIds.filter(item => item !== attachmentId);
				// 				$('#photos_hidden').val(photosIds.join(',')).trigger('change')
				// 				removedPhotos.push(attachmentId);
				// 				$('#photos_removed').val(removedPhotos.join(',')).trigger('change')

			});
		});
	} else {

		$('#photos').filepond({
			allowMultiple: true,
			// 		storeAsFile: true,
			required: true,
			maxFileSize: '500KB',
			acceptedFileTypes: ['image/png', 'image/jpeg'],
			maxParallelUploads: 1,
			checkValidity: true,
			maxFiles: 100,
			forceRevert: true,
			imagePreviewHeight: 250,	
			server: {
				process:(fieldName, file, metadata, load, error, progress, abort, transfer, options) => {

					// fieldName is the name of the input field
					// file is the actual file object to send
					const formData = new FormData();
					formData.append('action', 'upload_image');
					formData.append('security', RestVars.nonce);
					formData.append(fieldName, file, file.name);


					jQuery.ajax( {
						url: RestVars.ajaxurl,
						method: 'POST',
						processData: false,
						contentType: false,
						beforeSend: function ( xhr ) {
							xhr.setRequestHeader( 'X-WP-Nonce', RestVars.nonce );
						},
						data:formData
					} ).success( function ( response ) {
						// get a reference to the root node
						const pond = document.querySelector('.filepond--root');
						photosIds.push(response);
						$('#photos_hidden').val(photosIds.join(',')).trigger('change')

						load(response);			

						pond.addEventListener('FilePond:processfile', (e) => {

							var fileId = e.detail.file.id;
							var fileName = e.detail.file.filename;

							// Check if the element already contains .featured_image
							var fileItem = $('#filepond--item-'+fileId);
							fileItem.attr( 'data-attachment-id', response);
							if (!fileItem.find('.featured_image').length) {
								// If it doesn't contain .featured_image, append it
								fileItem.append('<span class="featured_image">Main Image</span>');
							}

						});
					} ).error( function( response ) {
						console.log( 'error' );
						console.log( response );
						error(response); // not sure if that contains the response message
					});
					// Should expose an abort method so the request can be canceled
					// 				return {
					// 					abort: () => {
					// 						// User tapped cancel, abort our ongoing actions here

					// 						// Let FilePond know the request has been canceled
					// 						xhr.abort();
					// 						abort();

					// 					},
					// 				};
				}, // process end

			},

		});
	}


	$(document).on('click', '.featured_image', function (e) {
		$('.featured_image').removeClass('active')
		$(this).addClass('active');
		var featuredId = $(this).closest('.filepond--item').data('attachment-id');
		$('#featured_image').val(featuredId).trigger('change')
	});


	// get a reference to the root node
	const pond = document.querySelector('.filepond--root');
	var removedPhotos = [];
	// Modify the FilePond:removefile event to trigger the file deletion
	$(document).on('FilePond:removefile', function(e) {
		var fileName = e.detail.file.filename;
		var fileId = e.detail.file.id;
		var fileItem = $('#filepond--item-'+fileId);
		var attachmentId =	fileItem.attr( 'data-attachment-id'); 

		var featuredImageVal = $('#featured_image').val();
		if(attachmentId === featuredImageVal) {
			$('#featured_image').val('').trigger('change')
		} 
	
		photosIds = photosIds.filter(item => item !== attachmentId);
		$('#photos_hidden').val(photosIds.join(',')).trigger('change')
		removedPhotos.push(attachmentId);
		$('#photos_removed').val(removedPhotos.join(',')).trigger('change')

	});
})