var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");

//MESSAGE SETTING --------------------------------------------------------------
var MSG_INFO = "งาน Intania Chula Mini Marathon 2018\nวันงาน อาทิตย์ที่ 14 ม.ค. 61\n\nรายละเอียดรอประกาศเพิ่มเติมจากทาง Page นะคะ"

var MSG_BIB = "รับ BIB ได้ที่งาน ICMM Expo วันเสาร์ที่ 13 ม.ค. 61\nโดยมารับด้วยตัวเอง หรือรับแทน (บัตรปชชและเลข BIB)\nไม่มีการจัดส่งทางไปรษณีย์ค่ะ"

var MSG_LIVECHAT = "กำลังทดสอบ"

var MSG_QUICK_REPLY = {
  "quick_replies":[
  {
    "content_type":"text",
    "title":"ข้อมูลการสมัคร",
    "payload":"Info"
  },
  {
    "content_type":"text",
    "title":"การรับ BIB",
    "payload":"Bib"
  },
  {
    "content_type":"text",
    "title":"ติดต่อทีมงาน",
    "payload":"Livechat"
  }
  ]
}
//END OF MESSAGE SETTING--------------------------------------------------------



var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 5000));

// Server index page
app.get("/", function (req, res) {
  res.send("Deployed!");
});

// Facebook Webhook
// Used for verification
app.get("/webhook", function (req, res) {
  if (req.query["hub.verify_token"] === process.env.VERIFICATION_TOKEN) {
    console.log("Verified webhook");
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    console.error("Verification failed. The tokens do not match.");
    res.sendStatus(403);
  }
});

// All callbacks for Messenger will be POST-ed here
app.post("/webhook", function (req, res) {
  // Make sure this is a page subscription
  if (req.body.object === "page") {
    // Iterate over each entry
    // There may be multiple entries if batched
    req.body.entry.forEach(function(entry) {
      // Iterate over each messaging event
      // if(entry.messaging){ // ADDED
      entry.messaging.forEach(function(event) {
        if (event.postback) {
          processPostback(event);
        } else if (event.message){
          processMessage(event);
        }
      });
    // } //ADDED
    });
    res.sendStatus(200);
  }
});

function processPostback(event) {
  var senderId = event.sender.id;
  var payload = event.postback.payload;

  if (payload === "Greeting") {
    // Get user's first name from the User Profile API
    // and include it in the greeting
    request({
      url: "https://graph.facebook.com/v2.6/" + senderId,
      qs: {
        access_token: process.env.PAGE_ACCESS_TOKEN,
        fields: "first_name"
      },
      method: "GET"
    }, function(error, response, body) {
      var greeting = "";
      if (error) {
        console.log("Error getting user's name: " +  error);
      } else {
        var bodyObj = JSON.parse(body);
        name = bodyObj.first_name;
        greeting = "สวัสดีค่ะคุณ " + name + "!\n";
      }
      var message = {
        "text": "" + greeting + "กรุณาพิมพ์ info เพื่อสอบถามข้อมูล หรือพิมพ์ help เพื่อติดต่อทีมงาน",
        MSG_QUICK_REPLY
      }
      sendMessage(senderId, message);
    });
  } else if (payload === "Info"){
    sendMessage(senderId, {text: MSG_INFO});
  } else if (payload === "Bib"){
    sendMessage(senderId, {text: MSG_BIB});
  } else if (payload === "Livechat"){
    sendMessage(senderId, {text: MSG_LIVECHAT});
  }
}


function processMessage(event) {
  if (!event.message.is_echo) {
    var message = event.message;
    var senderId = event.sender.id;

    console.log("Received message from senderId: " + senderId);
    console.log("Message is: " + JSON.stringify(message));

    // You may get a text or attachment but not both
    if (message.text) {
      var formattedMsg = message.text.toLowerCase().trim();

      // If we receive a text message, check to see if it matches any special
      // keywords and send back the corresponding movie detail.
      // Otherwise, search for new movie.
      if formattedMsg == "ข้อมูลการสมัคร"
      switch (formattedMsg) {
        case "info":
          displayMenu(senderId, formattedMsg);
          break;
        case "ข้อมูลการสมัคร":
        case "info":
        case "ratingxx":
          // getMovieDetail(senderId, formattedMsg);
          break;

        default:
          break;
      }
    } else if (message.attachments) {
      sendMessage(senderId, {text: "ขอโทษค่ะ ไม่สามารถรับไฟล์ได้"});
    }
  }
}

function displayMenu(userId, msg){
  var message = MSG_QUICK_REPLY
  sendMessage(senderId, message);
}

// sends message to user
function sendMessage(recipientId, message) {
  request({
    url: "https://graph.facebook.com/v2.6/me/messages",
    qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
    method: "POST",
    json: {
      recipient: {id: recipientId},
      message: message,
    }
  }, function(error, response, body) {
    if (error) {
      console.log("Error sending message: " + response.error);
    }
  });
}
