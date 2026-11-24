---
.title = "wiki",
.description = "server wiki",
.date = .date("2026-11-23T00:00:00"),
.layout = "wiki.shtml",
.custom = .{ .section = "wiki" },
---

особенности сервера и полезная информация

# # simple voice chat

на сервере установлен [simple voice chat](https://modrinth.com/plugin/simple-voice-chat) — голосовой чат для общения с другими игроками прямо в игре.

---

# # skin

для пиратских аккаунтов на сервере установлен плагин [SkinRestorer](https://modrinth.com/plugin/skinsrestorer)

- `/skin url <url>` - вставляете прямую ссылку на .png файл скина; можно использовать [skinsrestorer.net](https://skinsrestorer.net/upload) или любой другой хостинг прямых ссылок, хоть discord *(если канал публичен)*
- `/skin <nickname>` - для того чтоб активировать скин по нику лицензии

![](/images/wiki/skin.webp "skin url")

---

# # global и local чат

на сервере два канала текстового чата, команды:

- `/global` - общий чат для общения со всем сервером, стоит по стандарту (ненадо писать !текст и т.д.)
- `/local` - локальный чат для общения с игроками поблизости в радиусе 100 блоков

![](/images/wiki/chat.webp "chat")

*цвет ника зависит от измерения, в котором находится игрок*

![](/images/wiki/dimensions.webp "dimensions")

---

# # учёт игрового времени

учитывается только активное время в игре. 

режим afk влючается через 5 минут бездействия и отображается значком в табе, без кика из игры. 

![](/images/wiki/afk.webp "afk icon")

во время afk игрок всё так же уязвим.
