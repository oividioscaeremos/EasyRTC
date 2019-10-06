//
//Copyright (c) 2016, Skedans Systems, Inc.
//All rights reserved.
//
//Redistribution and use in source and binary forms, with or without
//modification, are permitted provided that the following conditions are met:
//
//    * Redistributions of source code must retain the above copyright notice,
//      this list of conditions and the following disclaimer.
//    * Redistributions in binary form must reproduce the above copyright
//      notice, this list of conditions and the following disclaimer in the
//      documentation and/or other materials provided with the distribution.
//
//THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
//AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
//IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
//ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
//LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
//CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
//SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
//INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
//CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
//ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
//POSSIBILITY OF SUCH DAMAGE.
//

let selfEasyrtcid = '';
var peers = {};
var noDCs = {};
let bloby = new Blob();

let currentCameraState = 'front';

function buildReceiveAreaName(easyrtcid) {
	return 'receivearea_' + easyrtcid;
}

function buildPeerBlockName(easyrtcid) {
	return 'peerzone_' + easyrtcid;
}

function blobToFile(theBlob, fileName) {
	theBlob.lastModifiedDate = new Date();
	theBlob.name = theBlob.lastModifiedDate.toString().replace(/\ \(\)/g, '') + '.png';
	return theBlob;
}

function sleep(milliseconds) {
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
		if ((new Date().getTime() - start) > milliseconds) {
			break;
		}
	}
}

function connect() {
	if (navigator.userAgent.indexOf("Windows") == -1) {
		$('start-call').css('visible', 'false');
	}
	//easyrtc.setVideoDims(1280, 720);
	easyrtc.enableDebug(false);
	easyrtc.enableDataChannels(true);
	easyrtc.setRoomOccupantListener(convertListToButtons);
	//easyrtc.connect('easyrtc.dataFileTransfer', loginSuccess, loginFailure);
	console.log("I'm here babe");

	easyrtc.easyApp('easyrtc.videoChatHd', 'selfVideo', ['callerVideo'], loginSuccess, loginFailure);

	//easyrtc.connect('easyrtc.dataFileTransfer', loginSuccess, loginFailure);
}

function clearConnectList() {
	var otherClientDiv = document.getElementById('otherClients');
	while (otherClientDiv.hasChildNodes()) {
		otherClientDiv.removeChild(otherClientDiv.lastChild);
	}
}

function convertListToButtons(roomName, data, isPrimary) {
	clearConnectList();
	var otherClientDiv = document.getElementById('otherClients');
	let receiveZone = document.getElementById('peerZone');

	var statusDiv = document.getElementById('status');

	function buildReceiveDiv(i) {
		var div = document.createElement('div');
		div.id = buildReceiveAreaName(i);
		div.className = 'receiveBlock';
		div.style.display = 'none';
		return div;
	}

	for (var easyrtcid in data) {
		var button = document.getElementById('start-call');
		button.disabled = false;
		button.onclick = (function (easyrtcid) {
			return function () {
				performCall(easyrtcid);
				easyrtc.setOnHangup(function (easyrtcid, slot) {
					document.getElementById('start-call').disabled = true;
				});
			};
		})(easyrtcid);

		var peerBlock = document.createElement('div');
		peerBlock.id = buildPeerBlockName(easyrtcid);
		peerBlock.className = 'peerblock';
		peerBlock.appendChild(document.createTextNode(' For peer ' + easyrtcid));
		peerBlock.appendChild(document.createElement('br'));
		peerBlock.appendChild(buildReceiveDiv(easyrtcid));
		receiveZone.appendChild(peerBlock);
		peers[easyrtcid] = true;

		function updateStatusDiv(state) {
			switch (state.status) {
				case 'waiting':
					statusDiv.innerHTML = 'waiting for other party<br>to accept transmission';
					break;
				case 'started_file':
					statusDiv.innerHTML = 'started file: ' + state.name;
					break;
				case 'working':
					statusDiv.innerHTML =
						state.name + ':' + state.position + '/' + state.size + '(' + state.numFiles + ' files)';
					break;
				case 'rejected':
					statusDiv.innerHTML = 'cancelled';
					setTimeout(function () {
						statusDiv.innerHTML = '';
					}, 2000);
					break;
				case 'done':
					statusDiv.innerHTML = 'done';
					setTimeout(function () {
						statusDiv.innerHTML = '';
					}, 3000);
					break;
			}
			return true;
		}

		var noDCs = {}; // which users don't support data channels

		var fileSender = null;

		function filesHandler(files) {
			// if we haven't eastablished a connection to the other party yet, do so now,
			// and on completion, send the files. Otherwise send the files now.
			var timer = null;
			if (easyrtc.getConnectStatus(easyrtcid) === easyrtc.NOT_CONNECTED && noDCs[easyrtcid] === undefined) {
				//
				// calls between firefrox and chrome ( version 30) have problems one way if you
				// use data channels.
				//
			} else if (easyrtc.getConnectStatus(easyrtcid) === easyrtc.IS_CONNECTED || noDCs[easyrtcid]) {
				if (!fileSender) {
					fileSender = easyrtc_ft.buildFileSender(easyrtcid, updateStatusDiv);
				}
				console.log("files before they're sent");
				console.log(files);
				fileSender(files, true /* assume binary */ );
			} else {
				easyrtc.showError('user-error', 'Wait for the connection to complete before adding more files!');
			}
		}

		$('#seperator').bind('DOMSubtreeModified', function (event) {
			let filesList = new Array(File);
			filesList.areBinary = true;
			filesList[0] = blobToFile(bloby);
			filesHandler(filesList);
		});
	}
}

function performCall(easyrtcid) {
	alert(easyrtcid);
	easyrtc.hangupAll();
	sleep(1000);
	var acceptedCB = function (accepted, caller) {
		if (!accepted) {
			easyrtc.showError('CALL-REJECTED', 'Sorry, your call to ' + easyrtc.idToName(caller) + ' was rejected');
		}
	};
	var successCB = function () {};
	var failureCB = function () {
		alert("hata");
		performCall(easyrtcid);
	};
	easyrtc.call(easyrtcid, successCB, failureCB, acceptedCB);
	theirID = easyrtcid;
}

// THIS CODE IS NEW FOR THE FILE TRANSFER

function acceptRejectCB(otherGuy, fileNameList, wasAccepted) {
	console.log("I'm here all fine.");
	console.log(fileNameList);

	var receiveBlock = document.getElementById(buildReceiveAreaName(otherGuy));
	//jQuery(receiveBlock).empty();
	receiveBlock.style.display = 'inline-block';

	//
	// list the files being offered
	//
	receiveBlock.appendChild(document.createTextNode('Files offered'));
	receiveBlock.appendChild(document.createElement('br'));
	for (var i = 0; i < fileNameList.length; i++) {
		receiveBlock.appendChild(
			document.createTextNode(i + '. ->' + fileNameList[i].name + '(' + fileNameList[i].size + ' bytes)')
		);
		receiveBlock.appendChild(document.createElement('br'));
	}
	//
	// provide accept/reject buttons
	//
	var button = document.createElement('button');
	button.appendChild(document.createTextNode('Accept'));
	button.onclick = function () {
		//jQuery(receiveBlock).empty();
		wasAccepted(true);
	};
	receiveBlock.appendChild(button);

	button = document.createElement('button');
	button.appendChild(document.createTextNode('Reject'));
	button.onclick = function () {
		wasAccepted(false);
		receiveBlock.style.display = 'none';
	};
	receiveBlock.appendChild(button);
}

function receiveStatusCB(otherGuy, msg) {
	var receiveBlock = document.getElementById(buildReceiveAreaName(otherGuy));
	if (!receiveBlock) return;

	console.log(msg);

	switch (msg.status) {
		case 'started':
			break;
		case 'eof':
			receiveBlock.innerHTML = 'Finished file';
			break;
		case 'done':
			receiveBlock.innerHTML = 'Stopped because ' + msg.reason;
			setTimeout(function () {
				receiveBlock.style.display = 'none';
			}, 1000);
			break;
		case 'started_file':
			receiveBlock.innerHTML = 'Beginning receive of ' + msg.name;
			break;
		case 'progress':
			receiveBlock.innerHTML = msg.name + ' ' + msg.received + '/' + msg.size;
			break;
		default:
			console.log('strange file receive cb message = ', JSON.stringify(msg));
	}
	return true;
}

function blobAcceptor(otherGuy, blob, filename) {
	console.log('blob');
	console.log(blob);
	console.log('filename');
	console.log(filename);
	easyrtc_ft.saveAs(blob, filename);
	let image = document.createElement('img');
	image.setAttribute('width', '20%');
	image.setAttribute('height', 'auto');
	image.setAttribute('src', URL.createObjectURL(blob));
	document.getElementById('peerZone').appendChild(image);
}

// THIS CODE IS NEW FOR THE FILE TRANSFER

function loginSuccess(easyrtcid) {
	selfEasyrtcid = easyrtcid;
	//easyrtc.connect('easyrtc.dataFileTransfer', loginSuccess, loginFailure);
	easyrtc_ft.buildFileReceiver(acceptRejectCB, blobAcceptor, receiveStatusCB);
	document.getElementById('change-camera-source').disabled = false;

	if (navigator.userAgent.indexOf("Windows") != -1) {
		const mediaSource = new MediaStream();
		// Older browsers may not have srcObject


		let stream = $("#selfVideo")[0].srcObject;
		console.log("stream");
		console.log(stream);
		let tracks = $("#selfVideo")[0].srcObject.getVideoTracks();
		console.log("tracks");
		console.log(tracks);
		tracks.forEach(t => {
			t.enabled = false;
		});
	} else {
		// müşteri hizmetleri fotoğrafı yer alabilir.
		alert("mahmut");

		/*$.ajax({
			type: "GET",
			url: "videos/vid.mp4",
			responseType: "blob",
			success: function (data) {
				let videoElement = document.createElement('video');
				videoElement.src = URL.createObjectURL(data);
				$("cameras").appendChild(videoElement);

			},
			error: function (xhr) {
				//debugger;
				console.log(xhr.responseText);
				alert(xhr.responseText);
			}
		});*/


	}


}

function loginFailure(errorCode, message) {
	easyrtc.showError(errorCode, message);
}

// Sets calls so they are automatically accepted (this is default behaviour)
easyrtc.setAcceptChecker(function (caller, cb) {
	cb(true);
});

// back camera control
function changeCamera(currentCameraState) {
	console.log(currentCameraState);
	easyrtc.showError('', currentCameraState);
	if (currentCameraState == 'front') {
		easyrtc.getVideoSourceList(function (list) {
			var i;
			for (i = 0; i < list.length; i++) {
				if (list[i].label.indexOf('back') > 0) {
					alert('back found');
					easyrtc.setVideoSource(list[i].id);
					easyrtc.initMediaSource(function () {
						var selfVideo = document.getElementById('selfVideo');
						easyrtc.setVideoObjectSrc(selfVideo, easyrtc.getLocalStream());
						document
							.getElementById('change-camera-source')
							.setAttribute('onClick', 'javascript : changeCamera("back")');
						performCall(theirID);
					}, connectFailure);
					break;
				}
			}
		});
	} else {
		easyrtc.getVideoSourceList(function (list) {
			var i;
			for (i = 0; i < list.length; i++) {
				if (list[i].label.indexOf('front') > 0) {
					easyrtc.setVideoSource(list[i].id);
					easyrtc.initMediaSource(function () {
						var selfVideo = document.getElementById('selfVideo');
						easyrtc.setVideoObjectSrc(selfVideo, easyrtc.getLocalStream());
						document
							.getElementById('change-camera-source')
							.setAttribute('onClick', 'javascript : changeCamera("front")');
						performCall(theirID);
					}, connectFailure);

					break;
				}
			}
		});
	}
}

function connectFailure(err) {
	alert(err);
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function take_photo() {
	const constraints = {
		video: {
			deviceId: cameraID ? {
				exact: cameraID
			} : undefined
		}
	};
	navigator.mediaDevices
		.getUserMedia(constraints)
		.then(gotMedia)
		.catch((error) => console.error('getUserMedia() error:', error));
}

function gotMedia(mediaStream) {
	const mediaStreamTrack = mediaStream.getVideoTracks()[0];
	const imageCapture = new ImageCapture(mediaStreamTrack);
	const img = document.createElement('img');

	imageCapture
		.takePhoto()
		.then((blob) => {
			img.setAttribute('src', URL.createObjectURL(blob));
			img.setAttribute('width', '100%');
			console.log(blob);
			bloby = blob;
			document.getElementById('seperator').appendChild(img);
			return;
			//send_taken_photo(blob);
			/*img.onload = () => {
				URL.revokeObjectURL(this.src);
			};*/
		})
		.catch((error) => console.error('takePhoto() error:', error));
	console.log(imageCapture);
}