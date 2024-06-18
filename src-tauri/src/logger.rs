use chrono::Local;
use log::LevelFilter;
use log4rs::{
    append::{console::ConsoleAppender, file::FileAppender},
    config::{Appender, Config, Logger, Root},
    encode::pattern::PatternEncoder,
};
use ansi_term::Colour::RGB;
pub fn init_logger() -> Result<(), Box<dyn std::error::Error>> {
    let datetime_color = RGB(97, 214, 214).prefix().to_string();
    let module_color = RGB(50, 127, 186).prefix().to_string();
    let reset_color = "\x1b[0m".to_string();

    let console_pattern = format!(
        "{{h({{l:<6}})}} | {0}{{d(%Y-%m-%d %H:%M:%S)}}{2} | {1}{{f}}:{{L}}{2} - {{m}}{{n}}",
        datetime_color, module_color, reset_color
    );
    let file_pattern = format!("{{h({{l:<6}})}} | {{d(%Y-%m-%d %H:%M:%S)}} | {{f}}:{{L}} - {{m}}{{n}}");

    let console_encoder = Box::new(PatternEncoder::new(&console_pattern));
    let file_encoder = Box::new(PatternEncoder::new(&file_pattern));

    let logfile = format!(
        "{}/{}.log",
        dirs_next::data_local_dir().unwrap()
            .join("com.btjawa.bilitools")
            .join("Logs")
            .to_string_lossy(),
        Local::now().format("%Y-%m-%d %H-%M-%S")
    );

    let stdout = ConsoleAppender::builder()
        .encoder(console_encoder)
        .build();

    let fileout = FileAppender::builder()
        .encoder(file_encoder)
        .build(logfile)?;

    let config = Config::builder()
        .appender(Appender::builder().build("stdout", Box::new(stdout)))
        .appender(Appender::builder().build("file", Box::new(fileout)))
        .logger(Logger::builder().build("sqlx::query", LevelFilter::Off))
        .logger(Logger::builder().build("sqlx::executor", LevelFilter::Off))
        .logger(Logger::builder().build("sqlx::pool", LevelFilter::Off))
        .logger(Logger::builder().build("sqlx::connection", LevelFilter::Off))
        .build(
            Root::builder()
                .appender("file")
                .appender("stdout")
                .build(LevelFilter::Info),
        )?;
    log4rs::init_config(config)?;
    Ok(())
}
