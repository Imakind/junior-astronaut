# Junior Astronaut

Образовательная браузерная игра для детей. Игрок помогает четырём астронавтам запитать марсианскую базу, пережить ночь, разведать площадку и вырастить первый урожай. Интерфейс игры на английском языке.

На карте 2.5D игрок выбирает комплект и участок для строительства. Астронавты собирают солнечные панели, накопитель и теплицу. Теплица открывается после разведки Scout и проверки воды и освещения. Материалы NASA дополняют учебные задания. Измерения на карте и расход ресурсов моделирует игра.

## Запуск

Установите Node.js и Bun. В корне репозитория выполните:

```powershell
bun install --frozen-lockfile
bunx next dev -p 3010
```

Откройте [localhost:3010](http://localhost:3010/).

Для запуска production-сборки в PowerShell:

```powershell
bun run build
$env:PORT = '3011'
node .next/standalone/server.js
```

Для основной миссии не требуется файл `.env`. Сведения NASA загружаются сервером, а при недоступности источников используются резервные данные.

## Материалы

- [Описание проекта](deliverables/JUNIOR_ASTRONAUT_PROJECT.md)
- [Видео геймплея](deliverables/Junior-Astronaut-gameplay.webm)
- [Архив 3D-моделей GLB](deliverables/Junior-Astronaut-3D-models.zip)
- [Сценарий презентации на английском](deliverables/JUNIOR_ASTRONAUT_PRESENTATION_SCRIPT_EN.md)
- [Источники NASA](artifacts/research-sources.md)

## Тесты

```powershell
bun test tests/research-gates.test.js tests/construction.test.js
```
