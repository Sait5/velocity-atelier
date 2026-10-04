# Velocity Atelier

Приватный 3D-шоурум на Nuxt 4, Vue 3, TypeScript и Three.js. Первый этап — Ferrari 458 Italia: осмотр, настройка отделки, салон и движение со звуком двигателя.

![Ferrari в студии](docs/images/showroom.jpg)

![Салон Ferrari](docs/images/cabin.jpg)

![Режим движения](docs/images/drive.jpg)

## Что готово

Детализированная Ferrari, открывающиеся двери, поднимающиеся боковые окна, плавный вход в салон, приборная панель, переключаемые фары, отражения и свет на полу. Цвет кузова и обивки сохраняется через localStorage. Есть ночная дорога, семь передач, газ, тормоз, задний ход и максимальная скорость 325 км/ч. Внешний звук двигателя отличается от записи в салоне; добавлены звуки дверей, торможения и музыка.

Это визуальный режим движения, а не гоночный симулятор. Для производительности используются адаптивное разрешение, ограниченная частота обновления звука/приборов, оптимизация теней и вращающихся дисков.

В гараже восемь машин: подробные Ferrari 458 Italia и Lamborghini Revuelto, остальные шесть — черновые модели будущей коллекции. Ferrari 458 занимает место прежней карточки Ferrari 296 GTB.

В поездке кнопки расположены в две колонки; для Ferrari и Revuelto доступны боковые окна. Диалог «Сменить карту» предлагает итальянскую улицу и ночную дорогу с фонарями. Выбор сохраняется в состоянии текущей сессии отдельно для каждого автомобиля. При смене карты модель и отделка сохраняются, движение сбрасывается, освобождаются ресурсы старого окружения. Экран загрузки закрывает сцену до загрузки карт, текстур, компиляции шейдеров и первого кадра; затем плавно исчезает. У Revuelto отдельный предел демонстрационного движения 370 км/ч; справочное значение каталога остаётся «350+». Предел Ferrari — 325 км/ч.

![Выбор дневной и ночной карты](docs/images/drive-map-picker.png)

![Экран загрузки поездки](docs/images/drive-loading.png)

![Дневная Италия без тумана](docs/images/revuelto-daylight-map.png)

![Ferrari 458 Italia в гараже](docs/images/garage-ferrari-458.png)

## Запуск разработчику

Рекомендуется Node.js 24 LTS и npm. Версии закреплены в package-lock.json.

```sh
npm ci
npm run dev
```

```sh
npm run typecheck
npm run build
```

Результат — `.output/public`. Это статическое приложение (`ssr: false`), backend и база данных не требуются. Локальный просмотр сборки: `npx serve .output/public`. Хостинг должен обслуживать ресурсы напрямую и возвращать index.html для маршрутов приложения.

## Карта проекта

| Файл | Назначение |
| --- | --- |
| app/pages/index.vue | Шоурум |
| app/pages/garage.vue | Черновой каталог |
| app/pages/drive/[car].vue | Движение |
| app/components/VehicleScene.client.vue | Сцена, камера, рендер и освобождение ресурсов |
| app/composables/useAtelier.ts | Общие настройки автомобиля |
| app/three/loadVehicle.ts | GLB, материалы, двери и окна |
| app/three/instruments.ts | Приборы и показания |
| app/three/vehicleLamps.ts | Фары и свет на полу |
| app/three/motionRoad.ts | Дорога, разметка и фонари с опорами |
| app/three/straightMotion.ts | Прямолинейное движение и трансмиссия |
| app/three/wheelShutter.ts | Быстро вращающиеся диски |
| app/three/engineAudio.ts, doorAudio.ts | Двигатель и двери |
| public/models, public/audio, public/textures | Готовые ресурсы браузера |
| tools/prepare-full-italia.py | Подготовка текущей модели; не требуется при сборке сайта |

В app/three и tools сохранены ранние эксперименты. Проверяйте импорты из текущей сцены: не все файлы используются. legacy-assets — архив прежних моделей.

## Добавление автомобиля

1. Получить модель и записать происхождение, автора и лицензию.
2. Настроить масштаб, ориентацию, положение на полу и группы материалов.
3. Разделить двери/окна и вращающиеся колёса/неподвижные суппорты; проверить оси вращения.
4. Подключить загрузчик и характеристики. Имена узлов Ferrari не переносить автоматически на другие модели.
5. Настроить отделку, фары, приборы, камеры и подходящие аудиозаписи.
6. Выполнить typecheck и сборку, визуально проверить зазоры, окна, двери, салон и движение. Проверить производительность и освобождение GPU/аудиоресурсов при смене страницы.

## GitHub и Vercel

Репозиторий остаётся **Private**. На Vercel включена Vercel Authentication → All Deployments: все адреса требуют входа и прав доступа. До отдельного решения владельца не отключать Deployment Protection. Автоматические Git-деплои пока отключены в vercel.json; новые версии запускаются вручную из панели Deployments.

Сборка: npm run build; выходной каталог: .output/public. Локальная привязка .vercel и секреты исключены из Git. Собственной авторизации в приложении нет: закрытый доступ обеспечивает хостинг.

## Ресурсы

Текущая модель — 2011 Ferrari 458 Italia, Ddiaz Design. Геометрия и текстуры сохранены с подготовкой дверей, колёс и материалов. [Происхождение и лицензии моделей](public/models/CREDITS.md).

Дорожные текстуры — Poly Haven. Записи двигателя и дверей предоставлены владельцем. [Кредиты текстур](public/textures/CREDITS.md), [кредиты аудио](public/audio/CREDITS.md). Лицензии ресурсов различаются; перед публичным или коммерческим запуском необходимо подтвердить права на исходные ресурсы. Общая лицензия на весь проект не заявлена.

Для работы сайта готовые ресурсы уже находятся в public. Исходные донорские модели для повторной подготовки могут потребовать отдельного получения.

Репозиторий: https://github.com/Sait5/velocity-atelier
Панель Vercel: https://vercel.com/saits-projects-f4e494ad/velocity-atelier


Закрытый сайт: https://velocity-atelier-saits-projects-f4e494ad.vercel.app/


## Lamborghini Revuelto — этап модели

Подключена модель Anatolian Studios (CC BY 4.0), выбранная владельцем. Прямой вход: `/?car=revuelto#showroom`. Сохранены исходные салон, кузов, текстуры и геометрия; добавлены группы дверей с подъёмом вверх, опускание основных боковых стёкол, оси вращения колёс и неподвижные суппорты. Адаптер: `app/three/revuelto.ts`. Звуки двигателя и окончательный свет для Revuelto — следующий этап; текущий режим движения использует временный синтезированный звук. Записи Ferrari на Revuelto не используются.

### Revuelto: cabin and music refinement
Door assemblies include inner painted shells, edge seals and latches; the two-phase opening first releases the door outward before lifting. A vehicle-specific driver anchor is used in showroom and drive. Five original instrumental themes are selectable in Settings, including the existing Atelier Ambient; Auto chooses Night Pulse for Revuelto. Theme choice is saved, track changes crossfade, and hidden tabs pause audio. Revuelto uses a darker studio floor and shorter background fog.

### Проверенный вид Revuelto

![Revuelto: собранные двери и тёмная студия](docs/images/revuelto-doors.jpg)

![Revuelto: положение камеры водителя](docs/images/revuelto-cabin.jpg)

Неподвижные непрозрачные поверхности объединяются в адаптере для отрисовки: 270 видимых объектов вместо 560, без изменения 547 717 треугольников. Стёкла, двери и вращающиеся колёса остаются отдельными. Исходные узлы сохраняются для работы с моделью, но часть статических узлов скрыта в пользу объединённых поверхностей.

### Окружение Revuelto и управление музыкой

Окружение Revuelto — небольшие одно-, двух- и трёхэтажные здания с четырьмя стенами и закрытыми крышами по обеим сторонам дороги. Используются архитектурные модули Modular Urban Apartments Facade, деревья Island Tree 01 и текстуры тротуаров Pavement 03 с Poly Haven (CC0). Этажность, ширина и оттенки отделки чередуются. Основания зданий отделены от дверей и окон; тротуар и покрытие дворов используют общую разметку UV в метрах и 4K цветовую текстуру. Позади зданий проходят невысокие границы дворов; дорожное покрытие и дворы выходят далеко за видимую границу сцены. Итальянская карта освещена дневным светом, с ясным небом без тумана; HDR Vatican Road используется только для освещения и отражений. Источники перечислены в public/models/CREDITS.md и public/textures/CREDITS.md. Ferrari сохраняет прежнюю дорогу.

Геометрия скачанных моделей оптимизирована Meshopt; текстуры включены внутрь GLB в WebP. Штукатурка фасадов использует исходные 4K карты цвета и нормалей; кремовый, терракотовый и оливковый оттенки сохраняют фотографическую фактуру. Бетонные блоки бордюра со швами примыкают к тротуару, без прежней металлической полосы. Фасады и деревья рисуются через InstancedMesh в пяти повторяемых секциях, без пересборки геометрии каждый кадр. Для повторной подготовки: `node tools/download-italian-environment.mjs`, затем `node tools/prepare-italian-environment.mjs`. Исходные большие файлы сохраняются за пределами Git в `../assets-research/italian-environment`.

Пять музыкальных тем находятся в верхней части настроек. Смена выполняется с плавным переходом; включение музыки и выбранная тема сохраняются. Звуки интерфейса подключены к кнопкам, ссылкам и переключателям, с защитой от двойного воспроизведения. Передние треугольные стёкла Revuelto и их рамки закреплены на кузове. Основные боковые стёкла и зеркала следуют за дверью; перед подъёмом дверь немного отходит наружу. Три исходных экранных поверхности салона получили читаемые дисплеи: живые скорость, обороты и передача, экран пассажира и центральная навигация. Фары дают короткую подсветку пола. Главная страница и поездка используют общий SceneLoading со сглаженным счётчиком и плавным исчезновением.

![Выбор пяти музыкальных тем](docs/images/revuelto-music-settings.png)

![Скачанные фасады и деревья в поездке Revuelto](docs/images/revuelto-italy-road.png)

![Исправленные основания, 4K тротуар и граница дворов в дымке](docs/images/revuelto-street-grounding.png)

![Бетонный бордюр и разные оттенки фасадов с 4K штукатуркой](docs/images/revuelto-curb-palette.png)

### Проверка обновления 4 октября

Архитектурные модули перед объединением уплощаются в подготовительном скрипте: 18 примитивов вместо 63. Окна фасадов непрозрачные; прозрачность остаётся у автомобильных стёкол и вырезной листвы. Камера использует меньшую чувствительность и сглаживание, дневная карта — голубое небо и более умеренную экспозицию.

После публикации проверены загрузка главной страницы и поездки, открытие дверей, три экранные поверхности салона и вращение камеры при авторазгоне. В текущем браузере на Ultra получены два замера: 102 и 98 FPS, 9,2 и 9,6 мс отрисовки; результат зависит от устройства, разрешения и ракурса. Ошибок консоли при этой проверке нет. Отдельная проверка геометрии подтвердила, что матрицы передних треугольных стёкол и рамок не меняются при открытии дверей и опускании окон.

![Общий экран загрузки главной страницы](docs/images/revuelto-main-loading.png)

![Открытые двери с закреплёнными на кузове передними стёклами](docs/images/revuelto-fixed-quarter-glass.png)

![Приборы, навигация и экран пассажира](docs/images/revuelto-cabin-displays.png)

![Дневная Италия после настройки света и оптимизации фасадов](docs/images/revuelto-daylight-polished.png)


### Стабильность дороги и экраны Revuelto

Покрытие тротуара отделено от бетонного основания на 21 мм (раньше 1 мм); polygon offset дополнительно защищает его от конфликта глубины. Основания домов опущены ниже пола модели. Улица повторяется восемью секциями на 640 м, дальняя граница камеры Италии — 260 м: секция возвращается в начало за пределами видимого диапазона, вместо появления в кадре без тумана.

Загрузка показывает целые проценты по одному, начиная с 1; сцена раскрывается только после достижения 100 и готовности ресурсов. Это счётчик этапов подготовки, а не процент скачанных байтов. Центральный экран салона показывает меню автомобиля вместо нарисованной карты; приборы используют центральный угловой тахометр и передачу, скорость слева и гибридную информацию справа. Ориентир: [официальная брошюра Revuelto](https://www.lamborghini.com/original/DAM/lamborghini/facelift_2019/model_detail/revuelto/2024/brochure/REVUELTO_DIGITAL_BROCHURE_EN_2024.pdf). Меню на поверхности 3D-экрана декоративное; управление сайтом остаётся в панели интерфейса.

Покрытие дворов разделено на две боковые поверхности, начиная за тротуаром (|z| ≥ 15 м). Под асфальтом больше нет второй текстурированной плоскости: это устраняет дальние пятна плитки на проезжей части.


После публикации проверен авторазгон до 370 км/ч с изменением ракурсов: прежние белые полосы плитки и перекрытие асфальта дворами не воспроизвелись. В интерфейсе при смене карты зафиксированы ранние 2% и 4%, затем завершение загрузки; проверено переключение Италия → ночь → Италия.

![Ранние проценты загрузки](docs/images/revuelto-loading-from-start.png)

![Меню автомобиля и обновлённый приборный экран](docs/images/revuelto-vehicle-menu-instruments.png)

![Проверка дороги при авторазгоне 370 км/ч](docs/images/revuelto-stable-road-370.png)


## Revuelto: screens, music, camera and Italian roofs (2026-10-04)

The native cluster surface now shows a circular 0–10 tachometer with red zone, moving needle, outlined central gear, speed, battery/fuel columns and chassis widget. The central screen uses a staggered hexagonal vehicle/media/settings launcher based on production Revuelto interior photographs and the [official HMI article](https://www.lamborghini.com/en-en/news/the-new-human-machine-interface-of-lamborghini-revuelto). The screen artwork is original; showroom screenshots supply the vehicle preview. The menu remains decorative.

The first and third original ambient tracks remain. Slots 2/4/5 now use full-length Neon, Machina and Chasing Daylight by Scott Buckley (CC BY 4.0 with visible Settings credits; see public/audio/CREDITS.md). They are distinct full mixes, not variations of the same short loop. Playback gain and the existing crossfade keep music quieter in Drive.

Cool and warm architectural galleries are selectable under Environment. Upholstery gains subtle grain while retaining imported maps, paint reflections are softened, and headlight floor spill is slightly brighter without extending its reach. Garage cards for the two completed cars now use screenshots of the actual model. The About navigation button is removed.

Italy uses instanced pitched tile roofs with scanned 2K PBR surfaces, gutters and chimneys; asphalt is less brown. Roofs share geometry and maps across street chunks. Existing depth separation and clear daylight remain intact.

Drive clamps its target pitch rather than only the displayed angle, preventing accumulated drag beyond the limit. Revuelto uses eight presentation gears with a brief torque cut on shifts; Ferrari retains seven. Revuelto audio is procedural V12 audio, not an authentic recording: it now responds to load, shifts, cabin/exterior views, airflow and braking. Ferrari's recorded audio remains unchanged.

Validation: npm run typecheck; npm run build; node tools/verify-drive.mjs (camera reversibility in three views, both speed limits, gear counts and braking). New MP3s decode at 44.1 kHz: Neon 259 s, Machina 291 s, Chasing Daylight 274 s.

Published browser checks: all three new music tracks play with decoded durations and no media errors; changing galleries works. Garage screenshots were recaptured from full viewport frames after detecting a crop error.

![Updated music selections](docs/images/revuelto-new-music.jpg)

![Warm showroom gallery](docs/images/revuelto-warm-gallery.jpg)

The published drive was checked at 370 km/h in exterior, cockpit and overhead views. Three downward camera drags followed by one upward drag raised the view without dead travel. No WebGL or media errors were reported during these checks. Italy's asphalt remained continuous in the inspected views. This is a presentation simulation, not a full vehicle physics model.

![Revuelto production-inspired cockpit](docs/images/revuelto-production-cockpit.jpg)

![Italy roofs and street](docs/images/revuelto-italian-roofs.jpg)

![Camera recovers upward at 370 km/h](docs/images/revuelto-roofs-drive.jpg)

![Completed model previews in the garage](docs/images/garage-real-models.jpg)


## Presentation, live garage and album (2026-10-04)

The showroom starts its introduction after `SceneLoading` finishes its fade. The car rolls 7.5 m onto the stage with rotating wheels, then the camera visits front, side, rear, overhead and wheel views before returning to OrbitControls. Dragging, scrolling, opening doors, entering the cabin, disabling camera animation or the Skip button interrupts the sequence and restores the car transform. Reduced-motion users bypass it. The sequence uses `app/three/showroomIntro.ts`; `node tools/verify-intro.mjs` verifies interruption and replay without displaced body/wheels.

`paintFinish.ts` adds a restrained viewing-angle pearl tint, thin-film iridescence and a polished clearcoat to the selected paint. Studio reflections drift slowly, retaining the selected color. Paint chips also show a gradient. Garage cards for the completed Revuelto and 458 now load the actual authored models with transparent WebGL canvases; they render on reveal, resize and pointer movement rather than continuously. Six future cars still have concept silhouettes.

Map thumbnails depict the actual map without a car or HUD. `public/images/maps/italy.webp` and `night.webp` are 720×400 renders made with `app/three/roadPreview.ts`. The picker serves these static WebP files, so opening it creates no additional WebGL scenes. Italy adds instanced terracotta planters, shrubs and downpipes. Service covers and drain grates are integrated into the asphalt shader to avoid depth conflicts. Kerb instances are prepared once and moved as a group rather than rebuilding 800 matrices every frame. Clear daylight and existing road-depth separation remain.

Eight music selections are available. Electric Dreams, Twilight Echo and Supernova by Scott Buckley join the previous five; full mixes, CC BY 4.0, artist credits in Settings and `public/audio/CREDITS.md`. These are licensed tracks, not copyright-free recordings.

The real Revuelto uses an eight-speed dual-clutch gearbox ([official brochure](https://www.lamborghini.com/sites/it-en/files/DAM/lamborghini/facelift_2019/model_detail/revuelto/2024/brochure/07_23/REVUELTO_DIGITAL_BROCHURE_EN_2024.pdf)); the scene now passes its gear count explicitly. Numerical ratios and acceleration remain a presentation simulation.
