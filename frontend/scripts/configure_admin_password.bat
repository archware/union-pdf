@echo off
setlocal
pushd "%~dp0\.." || exit /b 1

cargo run --locked --offline --manifest-path src-tauri\admin-recovery\Cargo.toml --bin configure_admin_password -- %*
set "HRA_CONFIGURE_EXIT=%ERRORLEVEL%"

popd
exit /b %HRA_CONFIGURE_EXIT%
