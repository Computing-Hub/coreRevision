# Quick Explainers (Beta)

Short Maths and English explainer videos for students who find these subjects hard.
Each topic has a short explanation, the video, practice questions and hidden answers.

## Pages

- `index.html` – home page: teachers tick topics and support settings, then copy a student link, a worksheet link or a QR code
- `about.html` – introduction for students and teachers
- `maths.html` – 11 Maths topics
- `english.html` – 6 English topics
- `pathway.html` – shows the topics in a link, in order, with the videos
- `allVideos/` – the `.mp4` videos and their `.vtt` captions (linked with relative paths)

## View locally

Open `index.html` in a browser, or run a local server:

```sh
python3 -m http.server 8000
```

then visit http://localhost:8000.

## Publish with GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo go to **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The site appears at `https://<user>.github.io/<repo>/`.

## Editing

- Each topic is one `<details class="topic">` block. Copy a block to add a new topic.
- Link straight to a topic with its id, e.g. `maths.html#hcf`.
- Stacked fractions use (the hidden first part is what screen readers and read-aloud say):
  `<span class="frac"><span class="sr-only">1 over 4</span><span class="top" aria-hidden="true">1</span><span class="bot" aria-hidden="true">4</span></span>`

## Links for a student or group

Topics are still written once, in `maths.html` and `english.html`. `pathway.html` reads them from those pages, so a new topic block appears on the home page automatically.

```
pathway.html?topics=hcf,lcm,peel&font=readable&audio=on&speed=0.75     on screen
pathway.html?topics=hcf,lcm,peel&print=1                               printable worksheet
```

| Setting | What it does |
|---|---|
| `topics=` | Topic ids, in the order the student sees them. Maths and English can be mixed. |
| `font=readable` | Bigger text, more spacing, plain background |
| `motion=reduce` | Nothing moves on the page |
| `chunk=small` | Only the first 3 questions (and answers) per topic |
| `audio=on` | "Read aloud" buttons for the explanation and the questions, using the best British voice on the device |
| `speed=0.75` or `1.25` | Video playback speed |
| `print=1` | Worksheet: explanation, a QR code per video, questions with space to write, answers on a separate page |

On screen, videos open with captions on. The settings also work on the subject pages (e.g. `maths.html?audio=on#hcf`), which is where the worksheet QR codes lead.
Every topic on the subject pages also gets a "Printable worksheet for this topic" link.

Nothing is stored or sent anywhere, and links contain no student details. The QR code generator is `js/vendor/qrcode.js` (qrcode-generator by Kazuhiko Arase, MIT licence).

These pages read the subject pages with `fetch`, so open them from a server (GitHub Pages, or `python3 -m http.server`), not by double-clicking the file.
