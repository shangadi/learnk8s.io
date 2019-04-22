import { Image, CSSBundle, JSScript, JSBundle } from '../assets'
import { Sitemap, LinkedNode, getAbsoluteUrl, getFullUrl } from '../sitemap'
import { h } from '../h'
import { Article, RelatedConentContainer, RelatedContentItem } from '../article'
import unified from 'unified'
const stringify = require('rehype-stringify')
import { BlogPosting, WithContext } from 'schema-dts'
import { Subscribe } from '../layout'
import * as Remark from '../remark'

export const Details = {
  type: identity<'scalingSpringBoot'>('scalingSpringBoot'),
  url: '/scaling-spring-boot-microservices',
  seoTitle: 'Scaling SpringBoot with Message Queues and Kubernetes ♦︎ Learnk8s',
  title: 'Scaling Microservices with Message Queues, Spring Boot and Kubernetes',
  description: `You should design your service so that even if it is subject to intermittent heavy loads, it continues to operate reliably. But how do you build such applications? And how do you deploy an application that scales dynamically?`,
  openGraphImage: Image({ url: 'src/scalingSpringBoot/autoscaling.png', description: 'Containers' }),
  publishedDate: '2018-07-11',
  lastModifiedDate: '2019-04-15',
  previewImage: Image({
    url: 'src/scalingSpringBoot/autoscaling.png',
    description: 'Scaling Microservices with Message Queues, Spring Boot and Kubernetes',
  }),
  author: {
    fullName: 'Daniele Polencic',
    avatar: Image({ url: 'assets/authors/daniele_polencic.jpg', description: 'Daniele Polencic' }),
    link: 'https://linkedin.com/in/danielepolencic',
  },
}

function identity<T>(value: T): T {
  return value
}

export function render(website: Sitemap, currentNode: LinkedNode<typeof Details>, siteUrl: string): string {
  const { css, js, html } = Remark.render(`${__dirname}/content.md`)
  return unified()
    .use(stringify)
    .stringify(
      <Article
        website={website}
        seoTitle={currentNode.payload.seoTitle}
        title={currentNode.payload.title}
        description={currentNode.payload.description}
        openGraphImage={currentNode.payload.openGraphImage}
        absolutUrl={getAbsoluteUrl(currentNode, siteUrl)}
        authorFullName={currentNode.payload.author.fullName}
        authorAvatar={currentNode.payload.author.avatar}
        authorLink={currentNode.payload.author.link}
        cssBundle={CSSBundle({
          paths: ['node_modules/tachyons/css/tachyons.css', 'assets/style.css'],
          styles: css,
        })}
        publishedDate={currentNode.payload.publishedDate}
        lastUpdated={currentNode.payload.lastModifiedDate}
      >
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              identity<WithContext<BlogPosting>>({
                '@context': 'https://schema.org',
                '@type': 'BlogPosting',
                headline: currentNode.payload.title,
                image: `${siteUrl}${currentNode.payload.previewImage.url}`,
                author: {
                  '@type': 'Person',
                  name: currentNode.payload.author.fullName,
                },
                publisher: {
                  '@type': 'Organization',
                  name: 'Learnk8s',
                  logo: {
                    '@type': 'ImageObject',
                    url: `${siteUrl}${
                      Image({ url: 'assets/learnk8s_logo_square.png', description: 'Learnk8s logo' }).url
                    }`,
                  },
                },
                url: getAbsoluteUrl(currentNode, siteUrl),
                datePublished: currentNode.payload.publishedDate,
                dateModified: currentNode.payload.publishedDate,
                description: currentNode.payload.description,
                mainEntityOfPage: {
                  '@type': 'SoftwareSourceCode',
                },
              }),
            ),
          }}
        />
        {html}

        <RelatedConentContainer>
          <RelatedContentItem>
            <a
              href={getFullUrl(website.children.blog.children.smallerDockerImage)}
              className='link navy underline hover-sky'
            >
              3 simple tricks for smaller Docker images
            </a>{' '}
            and learn how to build and deploy Docker images quicker.
          </RelatedContentItem>
          <RelatedContentItem>
            <a
              href={getFullUrl(website.children.blog.children.chaosEngineering)}
              className='link navy underline hover-sky'
            >
              Kubernetes Chaos Engineering: Lessons Learned — Part 1
            </a>
            what happens when things go wrong in Kubernetes? Can Kubernetes recover from failure and self-heal?
          </RelatedContentItem>
        </RelatedConentContainer>

        <Subscribe identifier='scaling-spring-boot' />

        <JSScript
          js={JSBundle({
            scripts: js,
            paths: ['src/scalingSpringBoot/anime.min.js', 'src/scalingSpringBoot/isScrolledIntoView.js'],
          })}
        />
      </Article>,
    )
}
