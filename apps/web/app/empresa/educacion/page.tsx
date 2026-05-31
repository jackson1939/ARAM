import { and, arrayContains, desc, eq } from 'drizzle-orm';
import { db, contenidoEducativo } from '@fundares/db';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import type { ContenidoEducativo } from '@/types';
import { BookOpen, Video, Image } from 'lucide-react';

const iconoTipo = { articulo: BookOpen, video: Video, infografia: Image } as const;
const colorTipo: Record<string, 'green' | 'blue' | 'yellow'> = {
  articulo: 'green',
  video: 'blue',
  infografia: 'yellow',
};

function mapContenido(row: typeof contenidoEducativo.$inferSelect): ContenidoEducativo {
  return {
    id: row.id,
    titulo: row.titulo,
    tipo: (row.tipo as ContenidoEducativo['tipo']) ?? 'articulo',
    url: row.url,
    contenido_md: row.contenidoMd,
    tags: row.tags,
    publicado: row.publicado ?? false,
    created_at: row.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export default async function EducacionPage({
  searchParams,
}: {
  searchParams: { tag?: string };
}) {
  const { tag } = searchParams;
  const database = db();

  const rows = await database
    .select()
    .from(contenidoEducativo)
    .where(
      tag
        ? and(eq(contenidoEducativo.publicado, true), arrayContains(contenidoEducativo.tags, [tag]))
        : eq(contenidoEducativo.publicado, true)
    )
    .orderBy(desc(contenidoEducativo.createdAt));

  const items = rows.map(mapContenido);
  const allTags = [...new Set(items.flatMap((item) => item.tags ?? []))].sort();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-black-heading">Educación ambiental</h1>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <a
            href="/empresa/educacion"
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!tag ? 'bg-primary-600 text-white' : 'bg-bg-page text-body-text hover:bg-border-default'}`}
          >
            Todos
          </a>
          {allTags.map((t) => (
            <a
              key={t}
              href={`/empresa/educacion?tag=${t}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${tag === t ? 'bg-primary-600 text-white' : 'bg-bg-page text-body-text hover:bg-border-default'}`}
            >
              {t}
            </a>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-center text-body-text/70 py-20">Sin contenido publicado aún</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => {
            const Icon = iconoTipo[item.tipo ?? 'articulo'];
            return (
              <Card key={item.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardBody className="flex flex-col flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <Badge variant={colorTipo[item.tipo ?? 'articulo']}>{item.tipo}</Badge>
                  </div>

                  <h3 className="font-semibold text-black-heading leading-snug">{item.titulo}</h3>

                  {item.tipo === 'video' && item.url ? (
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe
                        src={item.url.replace('watch?v=', 'embed/')}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  ) : item.contenido_md ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-4 flex-1">
                      <ReactMarkdown>{item.contenido_md}</ReactMarkdown>
                    </div>
                  ) : null}

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.tags.map((t) => (
                        <span key={t} className="text-xs bg-bg-page text-body-text px-2 py-0.5 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
