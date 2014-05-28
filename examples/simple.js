var cclog = require('cclog');
cclog.debug = cclog.log;
function noop(){}
var sendmail = require('sendmail')({
    logger: {
      debug: noop,
      info: cclog.info,
      warn: cclog.warn,
      error: cclog.error
    }
});
var box = require('../smtpd')({
    logger: cclog
});

box.on('msg', function(from, to, msg, body) {
    cclog.info('on msg');
    cclog.info(from);
    cclog.info(to);
    cclog.info(msg);
    cclog.info(body)
});

box.on('error', function(err, mail) {
    if(err){
      cclog.error(err);
    }
    cclog.log(mail)
});

box.listen(25, function() {
    console.log('server listen at', box.address().port)
    testSend();
});

function testSend() {
  sendmail({
      // to: 'test@localhost, test@sohu.com',
      to: 'test@localhost',
      from: 'gl@localhost',
      subject: 'test mailbox',
      content: 'Mail of blabla'
    }, function(err, reply) {
      console.log(err && err.stack);
      console.dir(reply);
  })
}
