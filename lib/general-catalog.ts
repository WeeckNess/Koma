import { Book, featured, validISBN, canonicalISBN } from "./books";
async function json(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) throw new Error("Catalogue indisponible");
    return await r.json() as any;
  } finally {
    clearTimeout(timeout);
  }
}
export async function generalSearch(input: string): Promise<Book[]> {
  const q = input.trim();
  const raw = q.replace(/[\s-]/g, "").toUpperCase();
  const isbn = canonicalISBN(raw) || raw;
  const exact = /^[0-9X]{10,13}$/.test(isbn);
  if (exact && !validISBN(isbn))
    throw new Error("Cet ISBN est invalide. Vérifiez les chiffres.");
  const known = featured.filter((b) =>
    exact
      ? b.isbn === isbn
      : (b.title + b.author).toLowerCase().includes(q.toLowerCase()),
  );
  let results: Book[] = [];
  let answered = false;
  try {
    const d = await json(
      "https://www.googleapis.com/books/v1/volumes?q=" +
        encodeURIComponent(exact ? "isbn:" + isbn : q + " subject:comics") +
        "&maxResults=20",
    );
    answered = true;
    results = (d.items || [])
      .map((x: any) => {
        const v = x.volumeInfo;
        return {
          isbn:
            v.industryIdentifiers?.find((i: any) => i.type === "ISBN_13")
              ?.identifier ||
            v.industryIdentifiers?.find((i: any) => i.type === "ISBN_10")
              ?.identifier,
          title: v.title,
          author: (v.authors || []).join(", "),
          cover: (v.imageLinks?.thumbnail || "").replace("http:", "https:"),
          publisher: v.publisher || "",
          description: (v.description || "").replace(/<[^>]*>/g, ""),
          date: v.publishedDate || "",
          language: v.language,
          source: "Google Books",
        };
      })
      .filter((b: Book) => b.isbn && validISBN(b.isbn) && (!exact || canonicalISBN(b.isbn) === isbn)).map((b: Book) => ({ ...b, isbn: canonicalISBN(b.isbn)! }));
  } catch {
    /* Try the second provider below. */
  }
  if (!results.length) {
    try {
      if (exact) {
        const d = await json(
          `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`,
        );
        answered = true;
        const v = d["ISBN:" + isbn];
        if (v)
          results = [
            {
              isbn,
              title: v.title,
              author: (v.authors || []).map((a: any) => a.name).join(", "),
              cover: v.cover?.large || v.cover?.medium || "",
              publisher: (v.publishers || [])
                .map((p: any) => p.name)
                .join(", "),
              description: typeof v.notes === "string" ? v.notes : "",
              date: v.publish_date || "",
              source: "Open Library",
            },
          ];
      } else {
        const d = await json(
          "https://openlibrary.org/search.json?q=" +
            encodeURIComponent(q + " manga") +
            "&limit=20&fields=title,author_name,isbn,cover_i",
        );
        answered = true;
        results = (d.docs || [])
          .map((v: any) => ({
            isbn: v.isbn?.find(validISBN),
            title: v.title,
            author: (v.author_name || []).join(", "),
            cover: "",
            publisher: "",
            description: "",
            date: "",
            source: "Open Library",
          }))
          .filter((b: Book) => b.isbn);
      }
    } catch {
      /* Known editions remain available without a network. */
    }
  }
  const unique = new Map<string, Book>();
  [...known, ...results].forEach((b) => {
    if (!unique.has(b.isbn)) unique.set(b.isbn, b);
  });
  if (!answered && !unique.size)
    throw new Error(
      "Les catalogues ne répondent pas. Vérifiez votre connexion puis réessayez.",
    );
  return [...unique.values()];
}
