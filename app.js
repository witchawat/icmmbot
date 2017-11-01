var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");
var exphbs  = require('express-handlebars');
var mongoose = require('mongoose');

//MongoDB
var db = mongoose.connect(process.env.MONGODB_URI);
var Command = require("./models/command");

//MESSAGE SETTING --------------------------------------------------------------
var MSG_INFO = "งาน Intania Chula Mini Marathon 2018\nวันงาน อาทิตย์ที่ 14 ม.ค. 61\n\nรายละเอียด รอประกาศเพิ่มจากทาง Page นะคะ"

var MSG_BIB = "รับ BIB ได้ที่งาน ICMM Expo วันเสาร์ที่ 13 ม.ค. 61\nโดยมารับด้วยตัวเอง หรือรับแทน (บัตรปชชและเลข BIB)\nไม่มีการจัดส่งทางไปรษณีย์ค่ะ"

var MSG_LIVECHAT = "เริ่มต้น Live Chat\nกำลังติดต่อทีมงาน..."
//END OF MESSAGE SETTING--------------------------------------------------------

var MONG

var app = express();

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 3000));

// Server index page
app.get("/", function (req, res) {
  res.render('home');
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
      if(entry.messaging){ // ADDED
      entry.messaging.forEach(function(event) {
        if (event.postback) {
          processPostback(event);
        } else if (event.message){
          processMessage(event);
        }
      });
    } else if (entry.standby){
      console.log("BOT IN STANDBY mode.... Taking control back from Real Admin");
      botTakeover()

    };
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
        "text": "" + greeting + "กรุณาพิมพ์ข้อความ เพื่อสอบถามข้อมูล\n\ninfo - ข้อมูลงานวิ่ง\nbib - การรับ BIB\nhelp - ติดต่อทีมงาน"
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
      var re = new RegExp("\b\w{1,7}\b");
      // If we receive a text message, check to see if it matches any special
      // keywords and send back the corresponding movie detail.
      // Otherwise, search for new movie.
      if (re.test(formattedMsg)){
        getCommand(senderId, formattedMsg);
      } 
    } else if (message.attachments) {
      sendMessage(senderId, {text: "ขอโทษค่ะ ไม่สามารถรับไฟล์ได้"});
    }
  }
}

function displayMenu(senderId, msg){
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

// FB Handover Protocol to Real Admin
function sendHandover(recipientId, message){
  request({
    url: "https://graph.facebook.com/v2.6/me/pass_thread_control",
    qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
    method: "POST",
    json: {
      recipient: {id: recipientId},
      target_app_id : 263902037430900,
    }
  }, function(error, response, body) {
    if (error) {
      console.log("Error sending message: " + response.error);
    } else {
      console.log(">>> Hand over to Real ADMIN INBOX <<<")
    }
  });
}

//Take control back from Real Admin
function botTakeover(recipientId){
  request({
    url: "https://graph.facebook.com/v2.6/me/take_thread_control",
    qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
    method: "POST",
    json: {
      recipient: {id: recipientId},
    }
  }, function(error, response, body) {
    if (error) {
      console.log("Error sending message: " + response.error);
    } else {
      console.log(">>> TAKE CONTROL BACK from Real ADMIN <<<")
    }
  });
}

function getCommand(senderId, cmd){
  Command.findOne({'name':cmd}, function(err, reply){
    if(err){
      sendMessage(senderId, {text: "Bot ไม่สามารถใช้งานได้ในขณะนี้\nกรุณารอทีมงานติดต่อกลับค่ะ"});
    } else if (reply.text !== null){
      sendMessage(senderId, {text: reply.text});
    } else {
      return
    }
  })

}
