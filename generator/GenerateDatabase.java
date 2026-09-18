import java.util.*;

/** No dependencies. Run: java generator/GenerateDatabase.java [people|countries|numbers] */
public class GenerateDatabase {
  static final Random rng = new Random();
  static String pick(String... values) { return values[rng.nextInt(values.length)]; }
  static String quote(String value) { return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""; }
  static String json(Object value) {
    if (value instanceof Map) {
      List<String> parts = new ArrayList<>();
      ((Map<?, ?>) value).forEach((k,v) -> parts.add(quote(k.toString()) + ":" + json(v)));
      return "{" + String.join(",", parts) + "}";
    }
    if (value instanceof List) {
      List<String> parts = new ArrayList<>();
      for (Object item : (List<?>)value) parts.add(json(item));
      return "[" + String.join(",", parts) + "]";
    }
    return value instanceof Number ? value.toString() : quote(value.toString());
  }
  static Map<String,Object> row(Object... values) {
    Map<String,Object> row = new LinkedHashMap<>();
    for (int i=0; i<values.length; i+=2) row.put(values[i].toString(),values[i+1]);
    return row;
  }
  static List<Map<String,Object>> people() {
    String[] first={"Alex","Sofia","James","Maya","Oliver","Amara","Noah","Luca","Emma","Ethan","Isabel","Leo","Chloe","Ava","Ben","Milo","Nina","Oscar","Zoe","Theo"};
    String[] last={"Morgan","Chen","Bennett","Patel","Williams","Okafor","Rivera","Rossi","Anderson","Park"};
    String[][] roles={
      {"Product designer","Remote","Figma, prototyping, design systems","Designs digital products with a distributed team. Mentors new designers."},
      {"Software engineer","Remote","TypeScript, React, SQL","Builds developer tools and APIs. Previously worked at an early-stage startup."},
      {"Architect","On-site","AutoCAD, sustainable design","Designs low-carbon buildings and visits construction sites."},
      {"Content strategist","Remote","Writing, SEO, storytelling","Turns technical ideas into stories. Works asynchronously across time zones."},
      {"Registered nurse","On-site","Patient care, clinical practice","Provides hands-on care in a community hospital."},
      {"Data analyst","Hybrid","SQL, Python, statistics","Finds patterns in messy data. Interested in climate technology."},
      {"Head chef","On-site","Cooking, team leadership","Runs a neighborhood restaurant using seasonal ingredients."},
      {"Customer success manager","Remote","Communication, SaaS, onboarding","Helps software customers get started across Europe and the Americas."},
      {"Mechanical engineer","On-site","CAD, manufacturing, robotics","Prototypes physical products and oversees factory production."},
      {"Illustrator","Remote","Illustration, visual storytelling","Creates editorial illustrations from a home studio."},
      {"Product manager","Hybrid","Research, B2B SaaS, roadmaps","Leads a collaboration software team. Former startup founder."},
      {"Research scientist","On-site","Biology, experiments, statistics","Studies marine ecosystems in the laboratory and in the field."}
    };
    List<String> names=new ArrayList<>();for(String f:first)for(String l:last)names.add(f+" "+l);Collections.shuffle(names,rng);
    List<Map<String,Object>> out=new ArrayList<>();int n=80+rng.nextInt(50);
    for(int i=0;i<n;i++) {
      String[] role=roles[rng.nextInt(roles.length)];
      out.add(row("id",i+1,"name",names.get(i),"job_title",role[0],"country",pick("United States","United Kingdom","Portugal","Germany","Canada","Denmark","Netherlands","Japan","Australia"),"work_mode",role[1],"experience_years",1+rng.nextInt(20),"skills",role[2],"description",role[3]));
    }
    return out;
  }
  static List<Map<String,Object>> countries() {
    // Real geographic descriptors; this is a shuffled reference sample, not generated factual statistics.
    String[][] data={
      {"Portugal","Europe","Lisbon","Atlantic coast, mild winters, Mediterranean climate","Portuguese"},
      {"Japan","Asia","Tokyo","Island nation, Pacific coast, mountains and temperate climate","Japanese"},
      {"Canada","North America","Ottawa","Atlantic and Pacific coasts, cold winters, forests and lakes","English, French"},
      {"Brazil","South America","Brasília","Atlantic coast, tropical rainforest and warm climate","Portuguese"},
      {"Germany","Europe","Berlin","North Sea and Baltic coasts, temperate climate","German"},
      {"Switzerland","Europe","Bern","Landlocked, alpine mountains and cold winters","German, French, Italian, Romansh"},
      {"Kenya","Africa","Nairobi","Indian Ocean coast, savannas and tropical climate","Swahili, English"},
      {"Australia","Oceania","Canberra","Island continent, extensive coast, desert interior","English"},
      {"Iceland","Europe","Reykjavík","North Atlantic island, cold climate and volcanoes","Icelandic"},
      {"Mexico","North America","Mexico City","Pacific and Gulf coasts, deserts and tropical regions","Spanish"},
      {"Argentina","South America","Buenos Aires","Atlantic coast, Andes mountains and temperate plains","Spanish"},
      {"Nepal","Asia","Kathmandu","Landlocked, Himalayan mountains, alpine climate","Nepali"},
      {"New Zealand","Oceania","Wellington","Pacific island nation, mountains and temperate climate","English, Māori"},
      {"Morocco","Africa","Rabat","Atlantic and Mediterranean coasts, mountains and desert","Arabic, Amazigh"},
      {"Norway","Europe","Oslo","North Atlantic coast, fjords and cold winters","Norwegian"},
      {"Thailand","Asia","Bangkok","Tropical climate, beaches and coast on two seas","Thai"},
      {"Chile","South America","Santiago","Long Pacific coast, Andes mountains and desert","Spanish"},
      {"Italy","Europe","Rome","Mediterranean coast, mild winters in the south, alpine north","Italian"},
      {"Mongolia","Asia","Ulaanbaatar","Landlocked, grassland and desert, very cold winters","Mongolian"},
      {"France","Europe","Paris","Atlantic and Mediterranean coasts, varied temperate climate","French"},
      {"South Africa","Africa","Pretoria","Atlantic and Indian Ocean coasts, diverse landscapes","Zulu, Xhosa, Afrikaans, English and others"},
      {"Costa Rica","North America","San José","Tropical rainforests, Pacific and Caribbean coasts","Spanish"},
      {"Greece","Europe","Athens","Mediterranean coast and islands, warm dry summers","Greek"},
      {"Malaysia","Asia","Kuala Lumpur","Tropical climate, coastlines and rainforests","Malay"},
      {"Finland","Europe","Helsinki","Baltic coast, many lakes, forests and cold winters","Finnish, Swedish"},
      {"Peru","South America","Lima","Pacific coast, Andes mountains and Amazon rainforest","Spanish, Quechua, Aymara"},
      {"Ireland","Europe","Dublin","North Atlantic island, mild rainy temperate climate","Irish, English"},
      {"Austria","Europe","Vienna","Landlocked, alpine mountains and temperate valleys","German"},
      {"Vietnam","Asia","Hanoi","Long coast, tropical south and monsoon climate","Vietnamese"},
      {"Uruguay","South America","Montevideo","Atlantic coast, grasslands and temperate climate","Spanish"}
    };
    List<String[]> shuffled=new ArrayList<>(Arrays.asList(data));Collections.shuffle(shuffled,rng);
    List<Map<String,Object>> out=new ArrayList<>();int n=18+rng.nextInt(13);
    for(int i=0;i<n;i++){String[] r=shuffled.get(i);out.add(row("id",i+1,"country",r[0],"continent",r[1],"capital",r[2],"languages",r[4],"description",r[3]));}
    return out;
  }
  static List<Map<String,Object>> numbers() {
    List<Map<String,Object>> out=new ArrayList<>();int n=50+rng.nextInt(51);
    for(int i=0;i<n;i++)out.add(row("id",i+1,"sensor","SEN-"+String.format("%03d",i+1),"location",pick("Greenhouse","Server room","Cold storage","Workshop","Office","Warehouse"),"temperature_c",-15+rng.nextInt(71),"humidity_pct",10+rng.nextInt(86),"battery_pct",1+rng.nextInt(100),"status",pick("Online","Online","Online","Offline","Maintenance")));
    return out;
  }
  public static void main(String[] args) {
    String type=args.length==0?pick("people","countries","numbers"):args[0];
    List<Map<String,Object>> rows;
    switch(type){case "people":rows=people();break;case "countries":rows=countries();break;case "numbers":rows=numbers();break;default:throw new IllegalArgumentException("Unknown dataset");}
    System.out.println(json(row("type",type,"rows",rows)));
  }
}
