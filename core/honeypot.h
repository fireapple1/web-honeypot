/* honeypot.h - 팀원 담당 */
#ifndef HONEYPOT_H
#define HONEYPOT_H

void server_start(int port);
void http_parse(const char *raw, char *method, char *path, char *user_agent, char *body);
void log_request(const char *timestamp, const char *ip, const char *method,
                 const char *path, const char *user_agent, const char *body);
void send_fake_response(int client_fd, const char *path);

#endif
