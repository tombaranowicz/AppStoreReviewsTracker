const request = require('request');
const CronJob = require('cron').CronJob;
const nodemailer = require('nodemailer');

async function fetchReviews(app, country, page) {

    let url = 'http://itunes.apple.com/rss/customerreviews/page=' + page + '/id=' + app + '/sortby=mostrecent/json?cc=' + country;

    return new Promise((resolve, reject) => {
        let reviews = [];
        request(url, function(err, res, body) {

            if(!err && res.statusCode == 200) {
                let jsonData = JSON.parse(body);
                let entry = jsonData['feed']['entry'];

                for (const rawReview of entry) {
                    try
                    {		
                        let comment = {};
                        comment['id'] = rawReview['id']['label'];
                        comment['author'] = rawReview['author']['name']['label'];
                        comment['version'] = rawReview['im:version']['label'];
                        comment['rate'] = rawReview['im:rating']['label'];
                        comment['title'] = rawReview['title']['label'];
                        comment['comment'] = rawReview['content']['label'];

                        reviews.push(comment);
                    }
                    catch (err) 
                    {
                        console.log(err);
                        reject(err);
                    }
                }
                resolve(reviews);
            } else {
                reject(err);
            }
        });
    });
}


const appId = '333903271'; //Twitter app id in AppStore
const page = '1';
const countryCode = 'us';

lastReviewId = 0;

async function startMonitoring() {
    let newReviews = [];

    try {
        let allReviews = await fetchReviews(appId, countryCode, page);
        if (allReviews.length > 0) {
            if (lastReviewId === 0) {
                lastReviewId = allReviews[0]['id'];
            } else {
                for (const review of allReviews) {
                    if(review['id'] === lastReviewId) {
                        break;
                    } else {
                        newReviews.push(review);
                    }
                }
            }
        }
    } catch (err) {

    }

    if(newReviews.length > 0) {
        sendNotification(newReviews);
    }
    console.log("We got " + newReviews.length + " new reviews.");
}

async function sendNotification(reviews) {

    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: '*****@gmail.com',
        pass: '**Password**'
      }
    });
  
    let textToSend = 'You got ' + reviews.length + ' new reviews';
    let htmlText = ""
  
    for (const review of reviews) {
      htmlText += "<b>" + review.title + "</b>"
      htmlText += "<p>" + review.comment + "</p>"
    }
  
    let info = await transporter.sendMail({
      from: '"Reviews Notifier" <******@gmail.com>',
      to: "*****@gmail.com",
      subject: "New Reviews!", 
      text: textToSend,
      html: htmlText
    });
  
    console.log("Message sent: %s", info.messageId);
}

let job = new CronJob('*/15 * * * * *', function() { //runs every 15 seconds in this config
    startMonitoring();
  }, null, true, null, null, true);
job.start();