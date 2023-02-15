package org.teradata;

import org.json.JSONArray;
import org.json.JSONObject;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;

public class ResponseMapper {
    public JSONArray convertToJson(ResultSet response) throws SQLException {
        JSONArray result = new JSONArray();
        while (response.next()) {
            result.put(this.convertRowToJson(response));
        }

        return result;
    }

    private JSONObject convertRowToJson(ResultSet response) throws SQLException {
        JSONObject resultObject = new JSONObject();
        ArrayList<String> columnLabels = this.getColumnLabels(response);

        for (String columnLabel : columnLabels) {
           resultObject.put(columnLabel, response.getString(columnLabel));
        }

        return resultObject;
    }

    private ArrayList<String> getColumnLabels(ResultSet response) throws SQLException {
        int numberOfColumns = response.getMetaData().getColumnCount();
        ArrayList<String> columnLabels = new ArrayList<>();

        for (int labelIndex = 1; labelIndex <= numberOfColumns; labelIndex++) {
            columnLabels.add(response.getMetaData().getColumnLabel(labelIndex));
        }

        return columnLabels;
    }
}
