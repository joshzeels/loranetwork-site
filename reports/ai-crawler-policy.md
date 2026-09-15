# AI crawler policy review

Status date: 2026-09-15

This document records the current technical behaviour. It does not make a business-policy decision.

The current `robots.txt` rule is `User-agent: *` with `Allow: /`. Standards-compliant crawlers covered by the wildcard are therefore allowed. None of the crawlers below has an explicit rule. CDN, firewall and hosting controls must also be checked before treating repository configuration as proof of production access.

## Crawler categories

- Search and indexing crawlers discover pages for conventional search results. Googlebot and Bingbot are in this category.
- AI search retrieval crawlers index or retrieve pages for generated search answers. OAI-SearchBot, PerplexityBot and Claude-SearchBot are in this category.
- Training crawlers collect web content that may be used for model development. GPTBot and ClaudeBot are in this category.
- User-directed fetchers retrieve a page in response to an individual user's request. Claude-User is in this category. Providers may treat robots rules differently for user-directed requests.

## Current status

| Crawler | Category | Current robots status | Explicitly configured |
| --- | --- | --- | --- |
| Googlebot | Search and indexing | Allowed by wildcard | No |
| Bingbot | Search and indexing | Allowed by wildcard | No |
| OAI-SearchBot | AI search retrieval | Allowed by wildcard | No |
| GPTBot | Training | Allowed by wildcard | No |
| PerplexityBot | AI search retrieval | Allowed by wildcard | No |
| ClaudeBot | Training | Allowed by wildcard | No |
| Claude-SearchBot | AI search retrieval | Allowed by wildcard | No |
| Claude-User | User-directed fetcher | Allowed by wildcard | No |

## Decision required

LoRa Network should decide separately whether it wants conventional indexing, AI-search retrieval, model-training access and user-directed fetching. Search visibility does not require accepting every training crawler. Any future change should be checked against current provider documentation and the production CDN or firewall configuration.

No crawler access rules were changed during AEO pass 1.
