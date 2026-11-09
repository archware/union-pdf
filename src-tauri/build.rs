use std::fs;
use std::path::Path;
use std::process::Command;

fn main() {
    let dist_dir = Path::new("../frontend/dist/pdf-tool/browser");
    let index_file = dist_dir.join("index.html");

    if !dist_dir.exists() || !index_file.exists() {
        println!("cargo:warning=[pdf-tool build.rs] frontend/dist no detectado. Compilando frontend Angular automáticamente...");
        let build_status = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(["/C", "npm run build"])
                .current_dir("../frontend")
                .status()
        } else {
            Command::new("npm")
                .args(["run", "build"])
                .current_dir("../frontend")
                .status()
        };

        let build_success = match build_status {
            Ok(s) => s.success(),
            Err(e) => {
                println!("cargo:warning=[pdf-tool build.rs] No se pudo invocar npm run build: {}", e);
                false
            }
        };

        if !build_success || !index_file.exists() {
            println!("cargo:warning=[pdf-tool build.rs] Creando distDir de contingencia para evitar proc-macro panic en tauri::generate_context!()...");
            if let Err(e) = fs::create_dir_all(dist_dir) {
                println!("cargo:warning=[pdf-tool build.rs] Error creando dist_dir: {}", e);
            }
            if !index_file.exists() {
                let fallback_html = "<!DOCTYPE html><html><head><title>pdf-tool</title></head><body><h1>pdf-tool build fallback</h1><p>Ejecute npm run build en frontend para generar los activos finales.</p></body></html>";
                let _ = fs::write(&index_file, fallback_html);
            }
        }
    }

    tauri_build::build();
}
