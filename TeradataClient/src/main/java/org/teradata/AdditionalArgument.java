package org.teradata;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class AdditionalArgument {
    private final String key;
    private final String value;

    private final String rawArgument;

    public AdditionalArgument(String arg) {
        this.rawArgument = arg;

        String patternStr = "^--(?<argName>\\S+)=(?<value>[\\s\\S]+)";
        Pattern pattern = Pattern.compile(patternStr);
        Matcher matcher = pattern.matcher(arg);

        if (matcher.find( )) {
            this.key = matcher.group("argName");
            this.value = matcher.group("value");
        } else {
            this.key = "";
            this.value = "";
        }

    }

    @Override
    public String toString() {
        if (this.key.isEmpty() || this.value.isEmpty()) {
            return rawArgument;
        } else {
            return this.key.toUpperCase() + "=" + this.value;
        }
    }
}
