# node-smtpd

```
var cclog = require('cclog')
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
```

## Similar project
[smtpd-lite](https://github.com/g6123/node-smtpd-lite)

