package org.teradata;

import org.json.JSONArray;

import java.sql.*;
import java.util.List;
import java.util.stream.Collectors;

public class TeradataService {
    final String DB_URL;
    final String USER;
    final String PASSWORD;
    final ResponseMapper mapper;
    Connection connection = null;
    Statement statement = null;
    ResultSet response = null;

    public TeradataService(String host, String port, String user, String password, List<AdditionalArgument> additionalArguments, ResponseMapper mapper) {
        this.USER = user;
        this.PASSWORD = password;
        this.mapper = mapper;
        this.DB_URL = this.getDbUrlFromArguments(host, port, additionalArguments);
    }

    public JSONArray executeQuery(String query) throws SQLException {
        this.statement = connection.createStatement();
        this.response = statement.executeQuery(query);

        return mapper.convertToJson(response);
    }

    public void openConnection() throws SQLException {
        this.connection = DriverManager.getConnection(this.DB_URL, this.USER, this.PASSWORD);
    }

    public void closeConnection() {
        if (response != null) {
            try {
                response.close();
            } catch (SQLException e) { /* Ignored */}
        }
        if (statement != null) {
            try {
                statement.close();
            } catch (SQLException e) { /* Ignored */}
        }
        if (connection != null) {
            try {
                connection.close();
            } catch (SQLException e) { /* Ignored */}
        }
    }

    private String getDbUrlFromArguments(String host, String port, List<AdditionalArgument> additionalArguments) {
        String additionalConnectionParams = this.getAdditionalConnectionParams(additionalArguments);

        return String.format("jdbc:teradata://%s/DBS_PORT=%s," + additionalConnectionParams, host, port);
    }

    private String getAdditionalConnectionParams(List<AdditionalArgument> additionalArguments) {
        return additionalArguments.stream().map(Object::toString).collect(Collectors.joining(","));

    }
}
