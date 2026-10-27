declare module 'nodemailer/lib/mail-composer' {
  import { SendMailOptions } from 'nodemailer';

  class MailComposer {
    constructor(options: SendMailOptions);
    compile(): {
      keepBcc: boolean;
      build(): Promise<Buffer>;
    };
  }

  export = MailComposer;
}
