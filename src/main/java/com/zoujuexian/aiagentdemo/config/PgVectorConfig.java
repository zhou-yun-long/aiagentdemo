package com.zoujuexian.aiagentdemo.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.pgvector.PgVectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

@Configuration
@ConditionalOnProperty(name = "spring.datasource.vectors.url")
public class PgVectorConfig {

    @Bean
    public DataSource dataSourceVectors(
            @Value("${spring.datasource.vectors.url}") String url,
            @Value("${spring.datasource.vectors.username}") String username,
            @Value("${spring.datasource.vectors.password}") String password) {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(url);
        ds.setUsername(username);
        ds.setPassword(password);
        ds.setPoolName("vectors-pool");
        ds.setMaximumPoolSize(5);
        return ds;
    }

    @Bean
    public JdbcTemplate jdbcTemplateVectors(DataSource dataSourceVectors) {
        return new JdbcTemplate(dataSourceVectors);
    }

    @Bean
    public PgVectorStore pgVectorStore(JdbcTemplate jdbcTemplateVectors, EmbeddingModel embeddingModel) {
        return PgVectorStore.builder(jdbcTemplateVectors, embeddingModel)
                .build();
    }
}
