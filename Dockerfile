FROM docker.m.daocloud.io/library/maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# 先复制 pom.xml，利用 Docker 缓存层
COPY pom.xml .

# 下载依赖（离线层，源码变动时不用重新下载）
RUN mvn dependency:go-offline -B

# 复制源码并构建
COPY src ./src
RUN mvn package -DskipTests -B

FROM docker.m.daocloud.io/library/eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

# 复制构建好的 JAR
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
