package org.teradata;

import org.json.JSONArray;
import org.json.JSONObject;

import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class App {
    public static void main(String[] args) {
        String host = findArgument(args, Argument.HOST);
        String port = findArgument(args, Argument.PORT);
        String user = findArgument(args, Argument.USER);
        String password = findArgument(args, Argument.PASSWORD);
        String query = cleanStringValue(findArgument(args, Argument.QUERY));
        List<AdditionalArgument> additionalArguments = getAdditionalArguments(args);

        TeradataService teradataService = new TeradataService(host, port, user, password, additionalArguments, new ResponseMapper());

        JSONObject result = new JSONObject();

        try {
            teradataService.openConnection();
            JSONArray queryResult = teradataService.executeQuery(query);
            result.put("data", queryResult);
        } catch (SQLException e) {
            JSONObject errorObj = new JSONObject();
            errorObj.put("message", e.getMessage());
            errorObj.put("stack", e.getStackTrace());

            result.put("error", errorObj);
        } finally {
            teradataService.closeConnection();
            print(result.toString());
        }
    }

    private static String cleanStringValue(String value) {
        return value.replaceAll("<\\$>", "\"");
    }

    private static String findArgument(String[] args, Argument argument) {
        return Arrays.stream(args)
                .filter(arg -> arg.startsWith(argument.getPrefix()))
                .map(arg -> arg.substring(argument.getStartValueIndex()))
                .findFirst()
                .orElse("");
    }

    private static List<AdditionalArgument> getAdditionalArguments(String[] args) {
        List<String> defaultArgumentPrefixes = Arrays.stream(Argument.values()).map(Argument::getPrefix).collect(Collectors.toList());

        return Arrays.stream(args)
                .filter(arg -> defaultArgumentPrefixes.stream().noneMatch(arg::startsWith))
                .map(AdditionalArgument::new)
                .collect(Collectors.toList());
    }

    private static void print(String value) {
        System.out.println(String.format("<hackolade>%s</hackolade>", value));
    }
}
