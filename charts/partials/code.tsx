import { DCChartKeys } from "@lib/types";
import CodeBlock, { Language } from "@components/CodeBlock";
import { useTranslation } from "@hooks/useTranslation";
import { FunctionComponent, useMemo } from "react";

interface CatalogueCodeProps {
  type: DCChartKeys;
  url: string;
}

const CatalogueCode: FunctionComponent<CatalogueCodeProps> = ({
  type,
  url,
}) => {
  const { t } = useTranslation(["catalogue", "common"]);

  const pythonTemplate = useMemo(() => {
    switch (type) {
      case "MAPBOX":
        return `# ${t("code_note")}: pip install geopandas pyarrow
# however, you should consider using uv for package management!

import geopandas as gpd

URL_MAP = "${url}"

g = gpd.read_parquet(URL_MAP)

# ----- add your code here -----`;

      default: // TIMESERIES | CHOROPLETH | TABLE
        return `# ${t("code_note")}: pip install pandas pyarrow
# however, you should consider using uv for package management!

import pandas as pd

URL_DATA = "${url}"

df = pd.read_parquet(URL_DATA)

# ----- add your code here -----`;
    }
  }, [type]);

  const juliaTemplate = useMemo(() => {
    switch (type) {
      case "GEOJSON":
        return ``;
      default: // TIMESERIES | CHOROPLETH | TABLE
        return ``;
    }
  }, [type]);

  const rTemplate = useMemo(() => {
    switch (type) {
      default: // TIMESERIES | CHOROPLETH | TABLE
        return `# ${t("code_note")}: install.packages("arrow")
library(arrow)
read_parquet("${url}")`;
    }
  }, [type]);

  return (
    <CodeBlock event={{ url }}>
      {{ python: pythonTemplate, r: rTemplate }}
    </CodeBlock>
  );
};

interface SampleCodeProps {
  url: string;
  catalogueId?: string;
}
const SampleCode: FunctionComponent<SampleCodeProps> = ({
  catalogueId = "<catalogue_id>",
  url,
}) => {
  const _url = `${process.env.APP_URL}/data-catalogue?id=${catalogueId}&limit=3`;

  const children: Partial<Record<Language, string>> = {
    javascript: `var requestOptions = {
  method: "GET",
  redirect: "follow",
};

fetch(
  "${_url}",
  requestOptions
)
  .then((response) => response.json())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));

    `,
    python: `import requests
import pprint

url = "${_url}" 

response_json = requests.get(url=url).json()
pprint.pprint(response_json)`,
    dart: `import 'package:http/http.dart' as http;

void main() async {
  var request = http.Request('GET', Uri.parse('${_url}'));
  
  request.followRedirects = false;
  
  http.StreamedResponse response = await request.send();
  
  if (response.statusCode == 200) {
    print(await response.stream.bytesToString());
  }
  else {
    print(response.reasonPhrase);
  }
  
}
    `,
    swift: `import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

var request = URLRequest(url: URL(string: "${_url}")!,timeoutInterval: Double.infinity)
request.httpMethod = "GET"

let task = URLSession.shared.dataTask(with: request) { data, response, error in 
  guard let data = data else {
    print(String(describing: error))
    exit(EXIT_SUCCESS)
  }
  print(String(data: data, encoding: .utf8)!)
  exit(EXIT_SUCCESS)
}

task.resume()
dispatchMain()
    
    `,
    kotlin: `import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.util.concurrent.TimeUnit

val client = OkHttpClient()
val request = Request.Builder()
  .url("${_url}")
  .build()
val response = client.newCall(request).execute()

println(response.body!!.string())
    `,
    java: `import java.io.*;
import okhttp3.*;
public class Main {
  public static void main(String []args) throws IOException{
    OkHttpClient client = new OkHttpClient().newBuilder()
      .followRedirects(false)
      .build();
    MediaType mediaType = MediaType.parse("text/plain");
    RequestBody body = RequestBody.create(mediaType, "");
    Request request = new Request.Builder()
      .url("${_url}")
      .method("GET", body)
      .build();
    Response response = client.newCall(request).execute();
    System.out.println(response.body().string());
  }
}
    `,
  };

  return <CodeBlock event={{ url }}>{children}</CodeBlock>;
};

export { SampleCode };

export default CatalogueCode;
