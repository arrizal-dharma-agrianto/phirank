import type { ContentGeneratorStructuredContent as StructuredContent } from "../types";

const renderTextBlock = (value: string | null) => {
  if (!value) {
    return <p className="text-xs text-gray-400">-</p>;
  }

  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
      {value}
    </div>
  );
};

const renderList = (items: string[] = []) => {
  if (!items.length) {
    return <p className="text-xs text-gray-400">-</p>;
  }

  return (
    <ul className="grid gap-1 text-sm leading-6 text-gray-700">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="break-words">
          {item}
        </li>
      ))}
    </ul>
  );
};

const ContentGeneratorStructuredContent = ({
  content,
}: {
  content: StructuredContent;
}) => {
  const sections = [
    {
      title: "Ringkasan strategi",
      node: renderTextBlock(content.strategySummary),
    },
    {
      title: "Meta title",
      node: renderList(content.titleOptions),
    },
    {
      title: "Meta description",
      node: renderList(content.descriptionOptions),
    },
    {
      title: "URL slug",
      node: renderList(content.slugOptions),
    },
    {
      title: "Konten utama",
      node: renderTextBlock(content.mainContent),
    },
    {
      title: "Rekomendasi internal link",
      node: content.internalLinks.length ? (
        <div className="grid gap-2">
          {content.internalLinks.map((link, index) => (
            <div
              key={`${link.raw}-${index}`}
              className="rounded-lg border border-gray-100 bg-white p-3"
            >
              <p className="break-words text-sm font-medium text-gray-900">
                {link.title}
              </p>
              {link.url ? (
                <p className="mt-1 break-all text-xs text-gray-500">
                  {link.url}
                </p>
              ) : null}
              {link.description ? (
                <p className="mt-1 break-words text-xs leading-5 text-gray-600">
                  {link.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">-</p>
      ),
    },
    {
      title: "Saran image alt text",
      node: renderList(content.imageAltTexts),
    },
    {
      title: "FAQ",
      node: content.faq.length ? (
        <div className="grid gap-2">
          {content.faq.map((item, index) => (
            <div
              key={`${item.question}-${index}`}
              className="rounded-lg border border-gray-100 bg-white p-3"
            >
              <p className="break-words text-sm font-medium text-gray-900">
                {item.question}
              </p>
              <p className="mt-1 break-words text-xs leading-5 text-gray-600">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">-</p>
      ),
    },
    {
      title: "Catatan optimasi SEO",
      node: renderList(content.seoNotes),
    },
    {
      title: "Tag konten",
      node: renderList(content.contentTags),
    },
  ];

  return (
    <div className="grid gap-3">
      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-lg border border-gray-100 bg-gray-50 p-4"
        >
          <h3 className="mb-2 text-sm font-medium text-gray-950">
            {section.title}
          </h3>
          {section.node}
        </section>
      ))}
    </div>
  );
};

export { ContentGeneratorStructuredContent };
