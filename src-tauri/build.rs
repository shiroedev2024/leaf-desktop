use leaf_build_deps::LeafBuilder;

fn main() {
    if let Err(err) = prepare_sidecar() {
        panic!("sidecar preparation failed: {}", err);
    }

    tauri_build::build();
}

fn prepare_sidecar() -> Result<(), Box<dyn std::error::Error>> {
    LeafBuilder::new()
        .cache_dir("./sidecar_cache")
        .output_dir("./bin")
        .build()?;
    Ok(())
}
