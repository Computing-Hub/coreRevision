# Quick Explainers (Beta)

Short Maths and English explainer videos for students who find these subjects hard.
Each topic has a short explanation, the video, practice questions and hidden answers.

## Pages

- `index.html` – introduction for students and teachers
- `maths.html` – 11 Maths topics
- `english.html` – 6 English topics
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
- Stacked fractions use: `<span class="frac"><span>1</span><span>4</span></span>`.
