use tauri_plugin_sql::{Migration, MigrationKind};

/// Must match `DATABASE_URL` in `src/database/client.ts`.
const DATABASE_URL: &str = "sqlite:haunt-ranker.db";

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create archive schema",
            sql: include_str!("../migrations/0001_archive_schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create personal schema",
            sql: include_str!("../migrations/0002_personal_schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "seed reference data",
            sql: include_str!("../migrations/0003_seed_reference_data.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add sample data flag",
            sql: include_str!("../migrations/0004_add_sample_data_flag.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "provenance: source types, event year sources, media distribution",
            sql: include_str!("../migrations/0005_provenance.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DATABASE_URL, migrations())
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
