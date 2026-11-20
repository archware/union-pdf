#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <unistd.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <fcntl.h>
#include <errno.h>

extern const unsigned char _binary_payload_start[];
extern const unsigned char _binary_payload_end[];

static const char *SEARCH_DIRS[] = {
    "/usr/lib/x86_64-linux-gnu",
    "/lib/x86_64-linux-gnu",
    "/usr/lib64",
    "/lib64",
    "/usr/lib",
    "/lib",
    "/usr/local/lib64",
    "/usr/local/lib",
    NULL
};

static int fmt_ok(int n, size_t cap) {
    return n > 0 && (size_t)n < cap;
}

static int find_lib(const char *name, const char *orig_ld, char *out, size_t out_sz) {
    if (orig_ld && orig_ld[0]) {
        const char *p = orig_ld;
        while (*p) {
            const char *colon = strchr(p, ':');
            size_t dlen = colon ? (size_t)(colon - p) : strlen(p);
            if (dlen > 0 && dlen + 1 + strlen(name) < out_sz) {
                memcpy(out, p, dlen);
                out[dlen] = '/';
                strcpy(out + dlen + 1, name);
                if (access(out, R_OK) == 0) return 1;
            }
            if (!colon) break;
            p = colon + 1;
        }
    }
    for (int i = 0; SEARCH_DIRS[i]; i++) {
        if (fmt_ok(snprintf(out, out_sz, "%s/%s", SEARCH_DIRS[i], name), out_sz) &&
            access(out, R_OK) == 0) {
            return 1;
        }
    }
    return 0;
}

static int ensure_owned_dir(const char *path) {
    if (mkdir(path, 0700) != 0 && errno != EEXIST) {
        return 0;
    }
    struct stat st;
    if (lstat(path, &st) != 0) return 0;
    if (!S_ISDIR(st.st_mode)) return 0;
    if (st.st_uid != getuid()) return 0;
    return 1;
}

static int replace_symlink(const char *target, const char *link_path) {
    unlink(link_path);
    return symlink(target, link_path) == 0;
}

/* Selecciona de forma atomica la familia ABI completa (4.0 o 4.1) para impedir
   que libsoup-2.4.so.1 y libsoup-3.0.so.0 se carguen simultaneamente en el mismo
   proceso cuando ambos paquetes coexisten en Ubuntu 24.04+ / Debian 13+ / Fedora 40+. */
static int configure_webkit_runtime_libs(
    const char *lib_dir,
    const char *orig_ld,
    int *warned_missing_libs
) {
    char wk40[1024], jsc40[1024], soup24[1024];
    char wk41[1024], jsc41[1024], soup30[1024];
    char link_wk[1024], link_jsc[1024], link_soup[1024];

    if (!fmt_ok(snprintf(link_wk, sizeof(link_wk), "%s/libwebkit2gtk-4.0.so.37", lib_dir), sizeof(link_wk)) ||
        !fmt_ok(snprintf(link_jsc, sizeof(link_jsc), "%s/libjavascriptcoregtk-4.0.so.18", lib_dir), sizeof(link_jsc)) ||
        !fmt_ok(snprintf(link_soup, sizeof(link_soup), "%s/libsoup-2.4.so.1", lib_dir), sizeof(link_soup))) {
        return 0;
    }

    int has_family_40 =
        find_lib("libwebkit2gtk-4.0.so.37", orig_ld, wk40, sizeof(wk40)) &&
        find_lib("libjavascriptcoregtk-4.0.so.18", orig_ld, jsc40, sizeof(jsc40)) &&
        find_lib("libsoup-2.4.so.1", orig_ld, soup24, sizeof(soup24));

    if (has_family_40) {
        unlink(link_wk);
        unlink(link_jsc);
        unlink(link_soup);
        if (orig_ld && orig_ld[0]) {
            setenv("LD_LIBRARY_PATH", orig_ld, 1);
        } else {
            unsetenv("LD_LIBRARY_PATH");
        }
        unsetenv("UNION_PDF_SHIM_LD");
        unsetenv("UNION_PDF_ORIG_LD_LIBRARY_PATH");
        return 1;
    }

    int has_family_41 =
        find_lib("libwebkit2gtk-4.1.so.0", orig_ld, wk41, sizeof(wk41)) &&
        find_lib("libjavascriptcoregtk-4.1.so.0", orig_ld, jsc41, sizeof(jsc41)) &&
        find_lib("libsoup-3.0.so.0", orig_ld, soup30, sizeof(soup30));

    if (has_family_41) {
        if (!replace_symlink(wk41, link_wk) ||
            !replace_symlink(jsc41, link_jsc) ||
            !replace_symlink(soup30, link_soup)) {
            return 0;
        }
        char new_ld[2560];
        if (orig_ld && orig_ld[0]) {
            if (!fmt_ok(snprintf(new_ld, sizeof(new_ld), "%s:%s", lib_dir, orig_ld), sizeof(new_ld))) {
                return 0;
            }
            setenv("UNION_PDF_ORIG_LD_LIBRARY_PATH", orig_ld, 1);
        } else {
            if (!fmt_ok(snprintf(new_ld, sizeof(new_ld), "%s", lib_dir), sizeof(new_ld))) {
                return 0;
            }
            setenv("UNION_PDF_ORIG_LD_LIBRARY_PATH", "", 1);
        }
        setenv("UNION_PDF_SHIM_LD", "1", 1);
        setenv("LD_LIBRARY_PATH", new_ld, 1);
        return 2;
    }

    if (!(*warned_missing_libs)) {
        *warned_missing_libs = 1;
        fprintf(stderr,
            "Unión PDF: faltan las bibliotecas de WebKit2GTK en el sistema.\n"
            "Instálelas ejecutando en su terminal:\n"
            "  Ubuntu 24.04+ / Debian 13+: sudo apt install -y libwebkit2gtk-4.1-0 libgtk-3-0\n"
            "  Ubuntu 22.04 / Debian 12:   sudo apt install -y libwebkit2gtk-4.0-37 libgtk-3-0\n"
            "  Fedora 40+ / RHEL 9+:       sudo dnf install -y webkit2gtk4.1 gtk3\n"
            "  Arch Linux / Manjaro:       sudo pacman -S webkit2gtk-4.1 gtk3\n");
    }
    return 0;
}

static uint64_t fnv1a64(const unsigned char *buf, size_t len) {
    uint64_t h = 14695981039346656037ULL;
    size_t step = len > 65536 ? (len / 16384) : 1;
    for (size_t i = 0; i < len; i += step) {
        h ^= (uint64_t)buf[i];
        h *= 1099511628211ULL;
    }
    h ^= (uint64_t)len;
    h *= 1099511628211ULL;
    return h;
}

static int try_launch_in_base(
    const char *base_dir,
    const char *orig_ld,
    uint64_t digest,
    size_t payload_size,
    char **argv,
    int *warned_missing_libs
) {
    if (!base_dir || base_dir[0] != '/') return -1;

    char runtime_dir[512];
    char lib_dir[560];
    char core_path[640];
    if (!fmt_ok(snprintf(runtime_dir, sizeof(runtime_dir), "%s/.union-pdf-rt-%u",
                         base_dir, (unsigned)getuid()), sizeof(runtime_dir)) ||
        !fmt_ok(snprintf(lib_dir, sizeof(lib_dir), "%s/lib", runtime_dir), sizeof(lib_dir))) {
        return -1;
    }

    if (!ensure_owned_dir(runtime_dir) || !ensure_owned_dir(lib_dir)) {
        return -1;
    }

    configure_webkit_runtime_libs(lib_dir, orig_ld, warned_missing_libs);

    if (!fmt_ok(snprintf(core_path, sizeof(core_path), "%s/union-pdf-core-%016llx",
                         runtime_dir, (unsigned long long)digest), sizeof(core_path))) {
        return -1;
    }

    struct stat st;
    if (lstat(core_path, &st) != 0 || !S_ISREG(st.st_mode) ||
        (size_t)st.st_size != payload_size) {
        char tmp_path[700];
        if (!fmt_ok(snprintf(tmp_path, sizeof(tmp_path), "%s.tmp.%d",
                             core_path, (int)getpid()), sizeof(tmp_path))) {
            return -1;
        }
        unlink(tmp_path);
        int fd = open(tmp_path, O_WRONLY | O_CREAT | O_EXCL, 0755);
        if (fd < 0) {
            return -1;
        }
        size_t written = 0;
        while (written < payload_size) {
            ssize_t n = write(fd, _binary_payload_start + written, payload_size - written);
            if (n <= 0) {
                if (errno == EINTR) continue;
                close(fd);
                unlink(tmp_path);
                return -1;
            }
            written += (size_t)n;
        }
        close(fd);
        chmod(tmp_path, 0755);
        if (rename(tmp_path, core_path) != 0) {
            unlink(tmp_path);
            return -1;
        }
    } else {
        chmod(core_path, 0755);
    }

    execv(core_path, argv);
    int saved_errno = errno;
    if (saved_errno == EACCES || saved_errno == EPERM) {
        /* Si el punto de montaje (ej. /tmp con noexec) rechaza execv, limpia el binario
           extraido en esta ruta y permite el fallback a $XDG_CACHE_HOME / $HOME/.cache. */
        unlink(core_path);
    }
    errno = saved_errno;
    return -1;
}

int main(int argc, char **argv) {
    (void)argc;
    if (!getenv("WEBKIT_DISABLE_DMABUF_RENDERER")) {
        setenv("WEBKIT_DISABLE_DMABUF_RENDERER", "1", 1);
    }

    const char *raw_ld = getenv("LD_LIBRARY_PATH");
    char orig_ld[1536];
    orig_ld[0] = '\0';
    if (raw_ld && raw_ld[0]) {
        if (!fmt_ok(snprintf(orig_ld, sizeof(orig_ld), "%s", raw_ld), sizeof(orig_ld))) {
            orig_ld[0] = '\0';
        }
    }

    size_t payload_size = (size_t)(_binary_payload_end - _binary_payload_start);
    uint64_t digest = fnv1a64(_binary_payload_start, payload_size);
    int warned_missing_libs = 0;

    /* 1. Intentar primero en /tmp (tmpfs en RAM). */
    try_launch_in_base("/tmp", orig_ld, digest, payload_size, argv, &warned_missing_libs);

    /* 2. Fallback para sistemas con /tmp montado como noexec: $XDG_CACHE_HOME. */
    const char *xdg_cache = getenv("XDG_CACHE_HOME");
    if (xdg_cache && xdg_cache[0] == '/') {
        ensure_owned_dir(xdg_cache);
        try_launch_in_base(xdg_cache, orig_ld, digest, payload_size, argv, &warned_missing_libs);
    }

    /* 3. Fallback a $HOME/.cache. */
    const char *home = getenv("HOME");
    if (home && home[0] == '/') {
        char home_cache[512];
        if (fmt_ok(snprintf(home_cache, sizeof(home_cache), "%s/.cache", home), sizeof(home_cache))) {
            ensure_owned_dir(home_cache);
            try_launch_in_base(home_cache, orig_ld, digest, payload_size, argv, &warned_missing_libs);
        }
    }

    /* 4. Ultimo respaldo en /var/tmp. */
    try_launch_in_base("/var/tmp", orig_ld, digest, payload_size, argv, &warned_missing_libs);

    perror("union-pdf: execv");
    return 1;
}
