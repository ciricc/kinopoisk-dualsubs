# Двойные субтитры для Кинопоиск HD (расширение для браузера)

Это расширение добавит двойные субтитры в видеоплеер на сайте <a href="https://hd.kinopoisk.ru/">hd.kinopoisk.ru</a>. Работает только с руссским и английским языками. Расширение позволяет настроить подсвечивание желтым цветом главной дорожки, а также размер текста из настроек оригинального плеера.

Расширение не является официальным. Работоспособность на всех устройствах не гарантирована. Это экспериментальный проект, "на коленках".

<img src="https://sun9-north.userapi.com/sun9-78/s/v1/ig2/ramrEsyh7eJJSKG1FqzjzIH1HQUmWs_w861QTB9yBmQ9A28Ic0MEfhuxMMcG3iriYIlrTZYb0KijDQdEqa3Pv9LB.jpg?size=1390x957&quality=96&type=album" alt="Демо">

Поддерживаемые браузеры:

- Google Chrome
- Opera (GX, Origin)
- Yandex Browser (<a href="browser://extensions/">browser://extensions/</a> - включить режим разработчика)
- Brave

## Установка

### Магазины приложений

Чаще всего, обновление доходит в магазины только через нескольно дней, после того, как оно появится во вкладке с [релизами](https://github.com/ciricc/kinopoisk-dualsubs/releases).

|[Opera Addons](https://addons.opera.com/ru/extensions/details/dvoinye-subtitry-kinopoisk-hd/) |[Chrome Webstore](https://chrome.google.com/webstore/detail/двойные-субтитры-кинопоис/imdaibjngbfnhodjfcbkaiegehaniglh) |
|-- | -- |
| <a href="https://addons.opera.com/ru/extensions/details/dvoinye-subtitry-kinopoisk-hd/"><img src="https://addons-static.operacdn.com/static/catalog/images/get-opera/opera-logo.png" width="128px"/></a> |<a href="https://chrome.google.com/webstore/detail/двойные-субтитры-кинопоис/imdaibjngbfnhodjfcbkaiegehaniglh"><img src="https://user-images.githubusercontent.com/20687373/181228666-cc05758a-4fce-4a6f-ab76-9cbb0d7dd1db.png" width="128px"/></a> |

### Вручную

Для установки, вам нужно скачать архив (`kinopoisk-dualsubs-x.y.z.zip`) с расширением из вкладки с <a href="https://github.com/ciricc/kinopoisk-dualsubs/releases">релизами</a>, после чего архив нужно разархивировать в любую папку, а затем эту папку установить как упакованное расширение (кнопка загрузить распакованное расширение в списке расширений). <br/> Если вы не видите кнопку для установки, то нужно сначала включить режим разработчика.

## Как использовать расширение

После установки, вам нужно открыть любой фильм или сериал на Кинопоиске, где есть английская и русская дорожка субтитров. Если вы выберите дорожку с английскими субтитрами - она будет основной дорожкой двойных субтитров и будет подсвечиваться желтым цветом. Вторая дорожка будет выстраиваться исходя из содержания первой.

## Мотивация

Бесплатный сыр только в мышеловке, это известно всем. Данное расширение я делаю по той причине, что во-первых, я сам смотрю и пересматриваю фильмы и сериалы в оригинале. И по скольку мои знания английского языка далеки от хороших, паралаллельно с просмотром фильма, я пополняю свой словарный запас с помощью двойных субтитров.

Создать расширение именно для Кинопоиска мне показалось наиболее приемлемым решением, в силу того, что мне нравится их оформление плеера, количество фильмов, в которых есть сразу две дорожки, не слишком сложное API, а также [отсутствие](https://kinopoisk.userecho.com/ru/communities/5/topics/737-dvojnyie-subtitryi) этого функционала на протяжении длительного времени.

Во-вторых, этот пет-проект - это мой полигон для изучения [Svelte](https://svelte.dev/). Мне было интересно, на сколько просто будет создавать с помощью Svelte компактные и простые расширения для браузера. Плюс ко всему, раньше я вообще не создавал расширений для браузера.

В-третьих - это повышение GitHub активности. Звездочки, коммиты и все такое прочее.
