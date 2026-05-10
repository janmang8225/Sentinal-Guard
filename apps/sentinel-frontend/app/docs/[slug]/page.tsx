import { notFound } from 'next/navigation';
import DocsShell from '@/components/docs/DocsShell';
import { DOCS_PAGES } from '@/components/docs/DocsPages';

export default async function DocsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = DOCS_PAGES[slug];

  if (!page) {
    notFound();
  }

  return <DocsShell page={page} />;
}
