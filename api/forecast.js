export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { locationName, weatherData } = req.body;

  if (!locationName || !weatherData) {
    return res.status(400).json({ error: "Missing locationName or weatherData" });
  }

  const WMO_CODES = {
    0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",
    45:"Foggy",48:"Icy fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",
    61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",
    80:"Rain showers",81:"Heavy showers",82:"Violent showers",
    95:"Thunderstorm",96:"Thunderstorm w/ hail",99:"Thunderstorm w/ heavy hail"
  };

  const current = weatherData.current;
  const daily = weatherData.daily;

  const days = daily.time.map((date, i) => ({
    date,
    maxTemp: daily.temperature_2m_max[i],
    minTemp: daily.temperature_2m_min[i],
    condition: WMO_CODES[daily.weather_code[i]] || "Unknown",
    precip: daily.precipitation_sum[i],
    windMax: daily.wind_speed_10m_max[i],
  }));

  const prompt = `You are a sharp, conversational AI meteorologist. Given the following real weather data for ${locationName}, write a weather briefing.

CURRENT CONDITIONS:
- Temperature: ${current.temperature_2m}°F (feels like ${current.apparent_temperature}°F)
- Humidity: ${current.relative_humidity_2m}%
- Wind: ${current.wind_speed_10m} mph
- Condition: ${WMO_CODES[current.weather_code] || "Unknown"}
- Precipitation: ${current.precipitation} in

5-DAY OUTLOOK:
${days.map(d => `${d.date}: ${d.condition}, High ${d.maxTemp}°F / Low ${d.minTemp}°F, Precip ${d.precip}in, Max wind ${d.windMax}mph`).join("\n")}

Write a 3-paragraph forecast:
1. Today's conditions in plain, vivid language — what it actually feels like outside
2. The week ahead — highlight any significant changes, storms, or notable patterns
3. A practical "what to wear / what to plan for" recommendation

Be conversational, specific, and useful. No fluff. Sound like a knowledgeable friend, not a news anchor.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    return res.status(200).json({ forecast: data.content[0].text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
