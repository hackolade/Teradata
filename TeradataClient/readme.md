# Requirements 

### For manual build:
For building the Teradata client on your system should be installed:

1. Java 8
2. Maven 3 [How install](https://www.baeldung.com/install-maven-on-windows-linux-mac).

For compiling the client execute `build.sh` script.

### For work in IntelliJ IDEA:

1. Specify JDK 8 in Project Settings -> Project Structure -> Project -> SDK
2. Install all dependencies with Maven plugin

For compiling client Using Maven plugin execute:

Lifecycle methods:
- `mvn clean`
- `mvn compile`

Plugins:
- `mvn assembly:single`

### Built artifacts

The built JAR file you can find following by `./target/Hackolade-Teradata-1.0-jar-with-dependencies.jar`
For use in Teradata plugin rename this JAR file to `TeradataClient.jar` and put to `reverse_engineering/addons/HackoladeClient.jar`
