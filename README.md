# KOReader Sync UI

A SvelteKit application being developed as a compatible replacement for
[KOReader Sync Server](https://github.com/koreader/koreader-sync-server), with a web interface.

## Compatibility checklist

- [x] Upstream Redis configuration and production database selection (DB 1).
- [ ] User registration and authentication match upstream.
- [ ] Password changes and account deletion match upstream.
- [ ] Progress reads and writes match upstream.
- [ ] Repeated updates and earlier reading positions are preserved.
- [ ] Error responses, status codes, and headers match upstream.
- [ ] Existing upstream Redis data works without migration.
- [ ] Redis writes can be read by the original server.
- [ ] Optional KOReader document metadata supported.
