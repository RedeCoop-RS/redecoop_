declare module 'nodemailer/lib/mail-composer' {
  import { SendMailOptions } from 'nodemailer';

  export default class MailComposer {
    constructor(options: SendMailOptions);
    compile(): {
      keepBcc: boolean;
      build(): Promise<Buffer>;
    };
  }
}
