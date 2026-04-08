CC = gcc
CFLAGS = -Wall -Wextra -O2
TARGET = honeypot
SRCS = main.c server.c http_parser.c logger.c response.c
OBJS = $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ -lsqlite3

%.o: %.c honeypot.h
	$(CC) $(CFLAGS) -c $<

clean:
	rm -f $(OBJS) $(TARGET)
