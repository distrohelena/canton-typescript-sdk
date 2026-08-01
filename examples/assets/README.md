# Canton Explorer Debug Playground DAR

This directory contains the normal Canton Explorer Debug Playground DAR from
`/home/helena/dev/daml/canton-explorer/debug-playground/.daml/dist/canton-explorer-debug-playground-0.1.0.dar`.
It is intentionally not the debug DAR.

- Canton Explorer checkout HEAD: `750b28dd0ce4674e4368c12a6da1b5b5cbb00f88`
- Package-introduction commit: `abde077`
- DAML SDK: `3.5.2`
- License: Apache-2.0
- SHA-256: `307cf7c52ac2770d1d1a2c5e1ec56a78ab7c70e7809c0cfb419abadb93cc6e29`

To rebuild the DAR:

```sh
cd /home/helena/dev/daml/canton-explorer/debug-playground
daml build
```

To verify the checked-in asset:

```sh
sha256sum examples/assets/canton-explorer-debug-playground-0.1.0.dar
```
