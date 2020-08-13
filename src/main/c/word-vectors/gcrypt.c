#include <gcrypt.h>

int hash(char* string, char* idBuffer) {
    unsigned char *x;
    unsigned i;
    gcry_md_hd_t h;
    gcry_md_open(&h, GCRY_MD_SHA3_256, GCRY_MD_FLAG_SECURE);
    gcry_md_write(h, string, strlen(string));
    x = gcry_md_read(h, GCRY_MD_SHA3_256);
    for (i = 0; i < 12; ++i) idBuffer[i] = x[i];
    gcry_md_close(h);

    return 0;
}
