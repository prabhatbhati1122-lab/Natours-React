// read understandall 41 before this
const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Aryan Bhati <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // sendgrid

      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      // the transporter is the service that willl actually send the email so here we acre creating the transported that will emial the token so inside this we needs to
      // specify the options as well like the service that we are going to use to send the email and the authentication and all sort of things
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        // this auth property is for the authentication
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });
    // 2) Define emial options
    const mailOptions = {
      // here we specify the mail options
      from: this.from, // from where the mail is coming from
      to: this.to, // recipients address
      subject,
      html,
      text: htmlToText.fromString(html), // so this one is basically the text version of the email
    };

    // 3) create a transport and send email

    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the natours family');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 min)',
    );
  }
};
