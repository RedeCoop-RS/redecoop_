#!/usr/bin/env bash
# Servidor IMAP (Dovecot) + SMTP (Postfix) local para os testes E2E da caixa do super admin.
# Ubuntu 22.04/24.04, com sudo. Usado localmente e no GitHub Actions.
#
# - Domínio redecoop.test com as caixas listadas em MAIL_USERS (senha E2E_MAIL_PASSWORD).
# - IMAP 993 (SSL) e 143 (STARTTLS), com IDLE, SPECIAL-USE e QUOTA (50 MB).
# - SMTP 465 (SSL) e 587 (STARTTLS) com autenticação; porta 25 aceita entrega local sem auth.
# - mail.redecoop.test aponta para 127.0.0.1. O certificado é autoassinado.
#   Não mapeie hosts da Hostinger: o nodemailer resolve por DNS e iria ao servidor real.
set -euo pipefail

DOMAIN="${MAIL_DOMAIN:-redecoop.test}"
PASSWORD="${E2E_MAIL_PASSWORD:-Senha-teste-123}"
USERS="${MAIL_USERS:-admin ana bruno carla}"

if [ ! -x /usr/sbin/dovecot ] || [ ! -x /usr/sbin/postfix ]; then
  echo "postfix postfix/main_mailer_type select No configuration" | sudo debconf-set-selections
  echo "postfix postfix/mailname string ${DOMAIN}" | sudo debconf-set-selections
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq dovecot-imapd dovecot-lmtpd postfix ssl-cert
fi

if ! grep -q "mail.${DOMAIN}" /etc/hosts; then
  echo "127.0.0.1 mail.${DOMAIN}" | sudo tee -a /etc/hosts >/dev/null
fi

getent group vmail >/dev/null || sudo groupadd -g 5000 vmail
id vmail >/dev/null 2>&1 || sudo useradd -u 5000 -g vmail -d /var/mail/vhosts -s /usr/sbin/nologin vmail
sudo mkdir -p "/var/mail/vhosts/${DOMAIN}"
sudo chown -R vmail:vmail /var/mail/vhosts

if [ ! -f /etc/ssl/private/ssl-cert-snakeoil.key ]; then
  sudo make-ssl-cert generate-default-snakeoil --force-overwrite
fi

: | sudo tee /etc/dovecot/e2e-users >/dev/null
for user in $USERS; do
  echo "${user}@${DOMAIN}:{PLAIN}${PASSWORD}:5000:5000::/var/mail/vhosts/${DOMAIN}/${user}::" \
    | sudo tee -a /etc/dovecot/e2e-users >/dev/null
done
sudo chown root:dovecot /etc/dovecot/e2e-users
sudo chmod 640 /etc/dovecot/e2e-users

sudo tee /etc/dovecot/dovecot.conf >/dev/null <<EOF
protocols = imap lmtp
listen = *
log_path = /var/log/dovecot-e2e.log
disable_plaintext_auth = no
auth_mechanisms = plain login
mail_location = maildir:~/Maildir
mail_uid = 5000
mail_gid = 5000
first_valid_uid = 5000
mail_plugins = \$mail_plugins quota

ssl = yes
ssl_cert = </etc/ssl/certs/ssl-cert-snakeoil.pem
ssl_key = </etc/ssl/private/ssl-cert-snakeoil.key

passdb {
  driver = passwd-file
  args = scheme=PLAIN username_format=%u /etc/dovecot/e2e-users
}
userdb {
  driver = passwd-file
  args = username_format=%u /etc/dovecot/e2e-users
}

namespace inbox {
  inbox = yes
  separator = /
  mailbox Drafts {
    special_use = \Drafts
    auto = subscribe
  }
  mailbox Sent {
    special_use = \Sent
    auto = subscribe
  }
  mailbox Trash {
    special_use = \Trash
    auto = subscribe
  }
  mailbox Junk {
    special_use = \Junk
    auto = subscribe
  }
  mailbox Archive {
    special_use = \Archive
    auto = subscribe
  }
}

plugin {
  quota = maildir:User quota
  quota_rule = *:storage=50M
}

protocol imap {
  mail_plugins = \$mail_plugins imap_quota
  mail_max_userip_connections = 50
}
protocol lmtp {
  postmaster_address = postmaster@${DOMAIN}
}

service imap-login {
  inet_listener imap {
    port = 143
  }
  inet_listener imaps {
    port = 993
    ssl = yes
  }
}
service lmtp {
  unix_listener /var/spool/postfix/private/dovecot-lmtp {
    mode = 0600
    user = postfix
    group = postfix
  }
}
service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}
EOF

if [ ! -f /etc/postfix/main.cf ]; then
  sudo cp /usr/share/postfix/main.cf.debian /etc/postfix/main.cf
fi
sudo postconf -e "myhostname = mail.${DOMAIN}"
sudo postconf -e "mydomain = ${DOMAIN}"
sudo postconf -e "mydestination = localhost"
sudo postconf -e "inet_interfaces = loopback-only"
sudo postconf -e "inet_protocols = ipv4"
sudo postconf -e "mynetworks = 127.0.0.0/8"
sudo postconf -e "virtual_mailbox_domains = ${DOMAIN}"
sudo postconf -e "virtual_transport = lmtp:unix:private/dovecot-lmtp"
sudo postconf -e "smtpd_sasl_type = dovecot"
sudo postconf -e "smtpd_sasl_path = private/auth"
sudo postconf -e "smtpd_tls_cert_file = /etc/ssl/certs/ssl-cert-snakeoil.pem"
sudo postconf -e "smtpd_tls_key_file = /etc/ssl/private/ssl-cert-snakeoil.key"
sudo postconf -e "smtpd_tls_security_level = may"
sudo postconf -e "smtpd_relay_restrictions = permit_mynetworks permit_sasl_authenticated reject_unauth_destination"
sudo postconf -e "message_size_limit = 52428800"
sudo postconf -e "mailbox_size_limit = 0"
sudo postconf -e "maillog_file = /var/log/postfix-e2e.log"
sudo postconf -e "compatibility_level = 3.6"
sudo newaliases

for service in smtps/inet submission/inet; do
  sudo postconf -M "${service}=${service%%/*} inet n - y - - smtpd" || true
done
sudo postconf -P "smtps/inet/smtpd_tls_wrappermode=yes"
sudo postconf -P "smtps/inet/smtpd_sasl_auth_enable=yes"
sudo postconf -P "smtps/inet/smtpd_client_restrictions=permit_sasl_authenticated,reject"
sudo postconf -P "submission/inet/smtpd_tls_security_level=encrypt"
sudo postconf -P "submission/inet/smtpd_sasl_auth_enable=yes"
sudo postconf -P "submission/inet/smtpd_client_restrictions=permit_sasl_authenticated,reject"

sudo doveadm stop >/dev/null 2>&1 || sudo pkill -x dovecot || true
sleep 1
sudo dovecot
sudo postfix stop >/dev/null 2>&1 || true
sudo postfix start

for _ in $(seq 1 30); do
  if (exec 3<>/dev/tcp/127.0.0.1/993) 2>/dev/null && (exec 3<>/dev/tcp/127.0.0.1/465) 2>/dev/null; then
    echo "Servidor de e-mail pronto (${DOMAIN}: ${USERS})."
    exit 0
  fi
  sleep 1
done
echo "IMAP/SMTP não subiram" >&2
sudo tail -n 50 /var/log/dovecot-e2e.log /var/log/postfix-e2e.log >&2 || true
exit 1
