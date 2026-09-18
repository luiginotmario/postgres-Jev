import { renderToStaticMarkup } from "react-dom/server";

interface DocumentOptions {
  script: string;
  styles?: string[];
  development?: boolean;
}

export function renderDocument({
  script,
  styles = [],
  development = false,
}: DocumentOptions): string {
  return (
    "<!doctype html>" +
    renderToStaticMarkup(
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Search</title>
          {styles.map((href) => (
            <link key={href} rel="stylesheet" href={href} />
          ))}
        </head>
        <body>
          <div id="root" />
          {development && <script type="module" src="/@vite/client" />}
          <script type="module" src={script} />
        </body>
      </html>,
    )
  );
}
