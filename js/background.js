var enabled = false;
var debug_headers = "akamai-x-cache-on, akamai-x-cache-remote-on, akamai-x-check-cacheable, akamai-x-get-cache-key, akamai-x-get-true-cache-key, akamai-x-get-extracted-values, akamai-x-get-request-id, akamai-x-serial-no, akamai-x-get-ssl-client-session-id, akamai-x-get-client-ip"
var akamai_header = { "name":"Pragma", "value":debug_headers}
var non_akamai_header = { "name":"Pragma", "value":""}


chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    "id": "akamaipurgeparent",
    "title": "Purge this URL", 
    "contexts":["all"]
  });
  chrome.contextMenus.create({
    "id": "akamaipurgechild1",
    "title": "Purge Staging Network", 
    "parentId": "akamaipurgeparent",
    "contexts":["all"]
  });
  chrome.contextMenus.create({
    "id": "akamaipurgechild2",
    "title": "Purge Production Network", 
    "parentId": "akamaipurgeparent",
    "contexts":["all"]
  });

});

chrome.contextMenus.onClicked.addListener(function(event){

  var network = "staging";

  if (event.srcUrl != null) {
    switch (event.menuItemId) {
      case "akamaipurgechild1":
        network = "staging";
        break;
      case "akamaipurgechild2":
        network = "production";
        break;
      default:
        network = "staging";
        break;
    }
  } else {
    alert("URL does not exist");
    return false;
  }

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.executeScript(tabs[0].id, {file: "js/jquery-3.1.1.min.js"}, function() {
      chrome.tabs.executeScript(tabs[0].id, {file: "js/HoldOn.min.js"}, function() {
        chrome.tabs.executeScript(tabs[0].id, {file: "js/modal.js"}, function() {
          chrome.tabs.sendMessage(tabs[0].id, {action: "open"}, function(response) {
            makePurgeRequest([event.srcUrl], network, function(){
              chrome.tabs.sendMessage(tabs[0].id, {action: "close"});
            });
          });
        });
      });
    });
  });

});

chrome.notifications.onClicked.addListener(function(event){
 // chrome.tabs.create({url: 'purgedetails.html?id=' + event});
 var itsdebug = false;
 var itspurge = false;
if(event.startsWith("Debug_r")){
  var itsdebug = true;
  chrome.tabs.create({url: 'debug-history.html'});
}
if(event.startsWith("Purge_r")){
  var itspurge = true;
  chrome.tabs.create({url: 'purgedetails.html?id=' + event});
}



});


chrome.runtime.onUpdateAvailable.addListener(function(){
	chrome.runtime.reload();
});


chrome.webRequest.onAuthRequired.addListener(
	function(details, callbackFn) {
		if(details.isProxy === false){
			callbackFn();
			return;
		}

		chrome.storage.local.get('lastProfileId', function(lastProfileIdObj){
			var lastProfileId = lastProfileIdObj['lastProfileId'];
			chrome.storage.local.get(lastProfileId, function(profileDataObj){
				var profileData = profileDataObj[lastProfileId];
				var paras = profileData.split('|');
				callbackFn({
				    authCredentials: {username: paras[4], password: paras[5]}
				});
			});
		});
	},
	{urls: ["<all_urls>"]},
	['asyncBlocking']
);




chrome.webRequest.onBeforeRequest.addListener(function(url){
  chrome.storage.local.get('update_type_debug', function(data){;
  var type = data['update_type_debug'];
  //console.log("type is :"  + type);
  if (type == 'ON'){
    enabled = type === 'ON';
}
  if(type == 'OFF'|| type == null){
    enabled = false;
}
  });

},  
{urls: ["<all_urls>"]},
["blocking"]);

chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    //console.log("enabled is :" + enabled);
    if(enabled){
    var pragma_exists = false
    for (var i = 0; i < details.requestHeaders.length; ++i) {
      if (details.requestHeaders[i].name === 'Pragma') {
        details.requestHeaders[i].value = details.requestHeaders[i].value.concat(", ",debug_headers)
        pragma_exists = true
       // console.log("pragma" + pragma_exists);
        break;
      }
    }
    if(!pragma_exists) {
      details.requestHeaders.push(akamai_header)
      //console.log("Akamai headers added to: " + details.url);
    }
    }
    else{
      //console.log("I am in the else loop" + enabled);
      var pragma_exists = false
      for (var i = 0; i < details.requestHeaders.length; ++i) {
        if (details.requestHeaders[i].name === 'Pragma') {
          details.requestHeaders.splice(i, 1);
          //console.log("Pragma removed: " + details.url);
          break;
        }
      }
      if(!pragma_exists) {
        //details.requestHeaders.push(non_akamai_header)
        //console.log("do nothing: " + details.url);
      }
    }

    return {requestHeaders: details.requestHeaders};

  },
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]);



