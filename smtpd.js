var net = require('net'),
    dns = require('dns'),
    MailParser = require("mailparser").MailParser,
    CRLF = '\r\n';


/*
 *   邮件服务返回代码含义
 *   500   格式错误，命令不可识别（此错误也包括命令行过长）
 *   501   参数格式错误
 *   502   命令不可实现
 *   503   错误的命令序列
 *   504   命令参数不可实现
 *   211   系统状态或系统帮助响应
 *   214   帮助信息
 *   220   服务就绪
 *   221   服务关闭传输信道
 *   421   服务未就绪，关闭传输信道（当必须关闭时，此应答可以作为对任何命令的响应）
 *   250   *要求的邮件操作完成
 *   251   用户非本地，将转发向
 *   450   要求的邮件操作未完成，邮箱不可用（例如，邮箱忙）
 *   550   *要求的邮件操作未完成，邮箱不可用（例如，邮箱未找到，或不可访问）
 *   451   放弃要求的操作；处理过程中出错
 *   551   用户非本地，请尝试
 *   452   系统存储不足，要求的操作未执行
 *   552   过量的存储分配，要求的操作未执行
 *   553   *邮箱名不可用，要求的操作未执行（例如邮箱格式错误）
 *   354   开始邮件输入，以.结束
 *   554   *操作失败
 *   535   用户验证失败
 *   235   用户验证成功
 *   334   等待用户输入验证信息
 *
 *
 *   DATA  开始信息写作
 *   EXPN<string>  验证给定的邮箱列表是否存在，扩充邮箱列表，也常被禁用
 *   HELO<domain>  向服务器标识用户身份，返回邮件服务器身份
 *   HELP<command> 查询服务器支持什么命令，返回命令中的信息
 *   MAIL FROM<host> 在主机上初始化一个邮件会话
 *   NOOP  无操作，服务器应响应OK
 *   QUIT  终止邮件会话
 *   RCPT TO<user> 标识单个的邮件接收人；常在MAIL命令后面可有多个rcpt to：
 *   RSET  重置会话，当前传输被取消
 *   SAML FROM<host> 发送邮件到用户终端和邮箱
 *   SEND FROM<host> 发送邮件到用户终端
 *   SOML FROM<host> 发送邮件到用户终端或邮箱
 *   TURN  接收端和发送端交换角色
 *   VRFY<user>  用于验证指定的用户/邮箱是否存在；由于安全方面的原因，服务器常禁止此命令
 */
function connectionListener (options, sock) {

  var logger = options && options.logger || {
    debug: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
  }

  var msg = '', data = '', step = 0, loginStep = 0, queue = [], login = [], parts, cmd;
  var mailparser = null, recipients = null, data_step = 0, data_txt = ''; // 0 none, 1 data start
  var mail_from = null, rcpt_to = null;
  var self = this;

  function w(s) {
    logger.debug('send ' + sock.remoteAddress + ':' + sock.remotePort + '>' + s);
    sock.write(s + CRLF);
  }

  // https://github.com/djwglpuppy/node-email-listener/blob/master/lib/index.js
  function resetMailparser() {
    data_step = 1;
    data_txt = '';
    mailparser = new MailParser;
    mailparser.on('end', function(mail_object) {
        self.emit('msg', mail_from, rcpt_to, mail_object, data_txt); //
    });
  }

  sock.setEncoding('utf8');

  sock.on('data', function(chunk) {
      data += chunk;
      parts = data.split(CRLF);
      for (var i = 0, len = parts.length - 1; i < len; i++) {
        on_line(parts[i]);
      }
      data = parts[parts.length - 1];
  });

  sock.on('error', function(err) {
      logger.error(err);
  });

  function on_line(line) {
    logger.debug('recv ' + sock.remoteAddress + ':' + sock.remotePort + '>' + line);
    if(data_step) {
      if(line == '.') {
        data_step = 0
        mailparser.end();
        w('250 OK');
      } else {
        data_txt += (line + CRLF);
        mailparser.write(line + CRLF);
      }
    } else {
      msg += (line + CRLF);
      // protocal code 4 char
      var match = line.match(/(\w{4})(?:$| (.*))/);

      if (match) {
        on_msg(match[1], match[2], msg);
        msg = '';
      }
    }
  }

  // queue.push('MAIL FROM:<' + from + '>');
  // for (var i = 0; i < recipients.length; i++) {
  //   queue.push('RCPT TO:<' + recipients[i] + '>');
  // }
  // queue.push('DATA');
  // queue.push('QUIT');
  // queue.push('');

  w('220 OK');// on connect

  function OK(msg) {
    w('250 ' + msg || '');
  }

  function ERR(msg) {
    w('550 ' + msg || '');
  }

  function on_msg(code, args, msg) {
    switch (code) {
      // case 220:
      //*   220   on server ready
      //*   220   服务就绪
      // if (/\besmtp\b/i.test(msg)) {
      //   // TODO:  determin AUTH type; auth login, auth crm-md5, auth plain
      //   cmd = 'EHLO';
      // } else {
      //   cmd = 'HELO';
      // }
      // w(cmd + ' ' + srcHost);
      case 'EHLO':
        w('502 Not supported');
        break;
      case 'HELO':
        // args - srchost
        w('250 OK');
        break;
      case 'MAIL':
        var match = args.match(/FROM *:? *<(.*)>/);
        if(match){
          mail_from = match[1];
        }
        w('250 OK');
        break;
      case 'RCPT':
        var match = args.match(/TO *:? *<(.*)>/);
        if(match) {
          rcpt_to = match[1];
        }
        w('250 OK')
        break;
      case 'DATA':
        w('354 End data with <CR><LF>.<CR><LF>')
        resetMailparser();
        // on_text  w('250 OK')
        // force bye w('221 Bye')
        break;
      case 'QUIT':
        w('221 Bye');
        break;
      default:
        w('200 OK');
    }
  }

}

var exports = module.exports = function (options) {

  var server = net.createServer();
  server.on('connection', connectionListener.bind(server, options));
  return server;
}
